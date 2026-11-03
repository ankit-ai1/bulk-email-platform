-- Run once in the Supabase SQL Editor on a project that already ran schema.sql.
-- Adds segmentation data, conversion revenue, and A/B tests on content and send time.
-- (A brand-new project doesn't need this: schema.sql already includes it.)

alter table public.contacts
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists gender text,
  add column if not exists birth_date date,
  add column if not exists total_spent numeric(14,2) not null default 0,
  add column if not exists order_count int not null default 0,
  add column if not exists last_purchase_at timestamptz;

alter table public.campaigns
  add column if not exists segment_filter jsonb not null default '{}',
  add column if not exists template_b_id uuid references public.templates(id) on delete set null,
  add column if not exists send_b_at timestamptz;
grant update (segment_filter, template_b_id, send_b_at) on public.campaigns to authenticated;

alter table public.campaign_recipients
  add column if not exists conversion_count int not null default 0,
  add column if not exists revenue numeric(14,2) not null default 0;

-- Empty or missing filter keys match everyone.
create or replace function public.contact_matches(c public.contacts, f jsonb) returns boolean
language sql stable set search_path = '' as $$
  select (nullif(f->>'tag','') is null or c.tags @> array[f->>'tag'])
    and (nullif(f->>'country','') is null or lower(c.country) = lower(f->>'country'))
    and (nullif(f->>'city','') is null or lower(c.city) = lower(f->>'city'))
    and (nullif(f->>'gender','') is null or lower(c.gender) = lower(f->>'gender'))
    and (nullif(f->>'minScore','') is null or c.engagement_score >= (f->>'minScore')::int)
    and (nullif(f->>'maxScore','') is null or c.engagement_score <= (f->>'maxScore')::int)
    and (nullif(f->>'engagedDays','') is null or c.last_engaged_at >= now() - make_interval(days => (f->>'engagedDays')::int))
    and (nullif(f->>'minSpent','') is null or c.total_spent >= (f->>'minSpent')::numeric)
    and (nullif(f->>'minOrders','') is null or c.order_count >= (f->>'minOrders')::int)
    and (nullif(f->>'purchasedDays','') is null or c.last_purchase_at >= now() - make_interval(days => (f->>'purchasedDays')::int))
$$;

create or replace function public.build_campaign_recipients(p_campaign uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare c public.campaigns; ids uuid[]; n int; split boolean;
begin
  select * into c from public.campaigns where id = p_campaign;
  ids := case when cardinality(c.list_ids) > 0 then c.list_ids when c.list_id is not null then array[c.list_id] else '{}' end;
  split := coalesce(c.subject_b, '') <> '' or c.template_b_id is not null or c.send_b_at is not null;
  insert into public.campaign_recipients (org_id, campaign_id, contact_id, email, name, variant)
  select c.org_id, c.id, d.id, d.email, d.name,
         case when split and row_number() over (order by d.id) % 2 = 0 then 'B' else 'A' end
  from (select distinct on (lower(ct.email)) ct.id, lower(ct.email) as email, ct.name
        from public.contacts ct
        where ct.org_id = c.org_id and ct.list_id = any(ids) and ct.status = 'active'
          and ct.consent_status <> 'denied'
          and (cardinality(c.segment_tags) = 0 or ct.tags && c.segment_tags)
          and public.contact_matches(ct, c.segment_filter)
          and not exists (select 1 from public.suppressions s where s.org_id = c.org_id and s.email = lower(ct.email))
        order by lower(ct.email), ct.created_at) d
  on conflict (campaign_id, email) do nothing;
  get diagnostics n = row_count;
  update public.campaigns set recipients_built_at = now() where id = c.id;
  return n;
end $$;

-- Variant B waits for its own send time when a send-time test is running.
create or replace function public.claim_recipients(p_campaign uuid, p_limit int) returns setof public.campaign_recipients
language sql security definer set search_path = '' as $$
  update public.campaign_recipients r set status = 'sending', claimed_at = now()
  where r.id in (select x.id from public.campaign_recipients x
                 where x.campaign_id = p_campaign and x.status = 'pending'
                   and (x.variant <> 'B' or coalesce((select c.send_b_at from public.campaigns c where c.id = p_campaign), now()) <= now())
                 limit p_limit for update skip locked)
  returning r.*
$$;

-- Attributes to the given campaign, else the contact's latest click in the last 30 days.
-- p_order_ref makes retries safe: the same order is never counted twice.
create or replace function public.record_conversion(p_org uuid, p_email text, p_amount numeric, p_campaign uuid default null, p_order_ref text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.campaign_recipients;
begin
  if p_order_ref is not null and exists (select 1 from public.email_events e where e.org_id = p_org and e.type = 'conversion' and e.detail->>'order_ref' = p_order_ref) then
    return null;
  end if;
  select * into r from public.campaign_recipients x
    where x.org_id = p_org and x.email = lower(p_email)
      and (case when p_campaign is not null then x.campaign_id = p_campaign else x.first_clicked_at >= now() - interval '30 days' end)
    order by x.first_clicked_at desc nulls last limit 1;
  if r.id is not null then
    update public.campaign_recipients set conversion_count = conversion_count + 1, revenue = revenue + p_amount where id = r.id;
  end if;
  update public.contacts set total_spent = total_spent + p_amount, order_count = order_count + 1, last_purchase_at = now()
    where org_id = p_org and lower(email) = lower(p_email);
  insert into public.email_events (org_id, campaign_id, recipient_id, contact_id, type, detail)
    values (p_org, r.campaign_id, r.id, r.contact_id, 'conversion', jsonb_build_object('amount', p_amount, 'order_ref', p_order_ref));
  return r.campaign_id;
end $$;

revoke execute on function public.contact_matches(public.contacts, jsonb) from public, anon, authenticated;
revoke execute on function public.record_conversion(uuid, text, numeric, uuid, text) from public, anon, authenticated;
revoke execute on function public.build_campaign_recipients(uuid), public.claim_recipients(uuid, int) from public, anon, authenticated;
grant execute on function public.contact_matches(public.contacts, jsonb), public.record_conversion(uuid, text, numeric, uuid, text) to service_role;

create or replace view public.campaign_metrics with (security_invoker = true) as
select r.campaign_id, r.org_id,
  count(*)                                                   as total_scheduled,
  count(*) filter (where r.status = 'pending')               as pending,
  count(*) filter (where r.status in ('sent'))               as sent,
  count(*) filter (where r.status = 'failed')                as failed,
  count(*) filter (where r.status = 'sent' and r.bounced_at is null) as delivered,
  count(*) filter (where r.first_opened_at is not null)      as unique_opens,
  coalesce(sum(r.open_count),0)                              as total_opens,
  count(*) filter (where r.open_count > 1)                   as reopened,
  coalesce(sum(r.machine_open_count),0)                      as machine_opens,
  count(*) filter (where r.first_clicked_at is not null)     as unique_clicks,
  coalesce(sum(r.click_count),0)                             as total_clicks,
  count(*) filter (where r.bounced_at is not null)           as bounced,
  count(*) filter (where r.bounce_type = 'hard')             as hard_bounces,
  count(*) filter (where r.bounce_type = 'soft')             as soft_bounces,
  count(*) filter (where r.unsubscribed_at is not null)      as unsubscribed,
  count(*) filter (where r.complained_at is not null)        as complaints,
  count(*) filter (where r.replied_at is not null)           as replies,
  count(*) filter (where r.conversion_count > 0)             as conversions,
  coalesce(sum(r.revenue),0)                                 as revenue
from public.campaign_recipients r group by r.campaign_id, r.org_id;

create or replace view public.variant_metrics with (security_invoker = true) as
select campaign_id, variant, count(*) filter (where status = 'sent') as sent,
  count(*) filter (where first_opened_at is not null) as unique_opens,
  count(*) filter (where first_clicked_at is not null) as unique_clicks,
  count(*) filter (where conversion_count > 0) as conversions,
  coalesce(sum(revenue),0) as revenue
from public.campaign_recipients group by campaign_id, variant;

create or replace view public.org_metrics with (security_invoker = true) as
select org_id, sum(total_scheduled) as total_scheduled, sum(sent) as sent, sum(delivered) as delivered,
  sum(unique_opens) as unique_opens, sum(unique_clicks) as unique_clicks, sum(bounced) as bounced,
  sum(complaints) as complaints, count(*) as campaigns_sent, sum(revenue) as revenue
from public.campaign_metrics group by org_id;
