-- Synerax Mail: complete database for a NEW Supabase project.
-- Paste this whole file into Supabase > SQL Editor and click Run. Run it once.
--
-- After it succeeds:
--   1. Authentication > Users > Add user: create your own login (tick "Auto Confirm User").
--   2. In the SQL Editor run:  select public.bootstrap_super_admin('you@yourcompany.com');
--   3. Authentication > Sign In / Providers: turn OFF "Allow new users to sign up".
--      Accounts are created only by Synerax and Client Admins.
--
-- RLS is the tenant boundary. Anything needing secrets or auth-admin rights goes
-- through the worker (service role), never the browser.

-- ── Base tables ─────────────────────────────────────────────────────────────────
create table if not exists public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, name text not null, total_contacts int default 0,
  created_at timestamptz default now()
);
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references public.contact_lists(id) on delete cascade,
  user_id uuid, name text, email text not null, company text,
  status text default 'active', created_at timestamptz default now()
);
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, name text not null, subject text, body text,
  is_html boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, name text not null, subject text,
  template_id uuid, list_id uuid, list_ids uuid[] default '{}',
  from_name text, from_email text, status text default 'draft',
  launched_at timestamptz, sent_count int default 0, delivered_count int default 0,
  failed_count int default 0, created_at timestamptz default now()
);
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, campaign_id uuid, email text, recipient_name text, status text,
  error_message text, message_id text, created_at timestamptz default now()
);
create table if not exists public.sender_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, email text not null, name text, is_verified boolean default false,
  otp_code text, otp_expires_at timestamptz, created_at timestamptz default now(),
  unique (user_id, email)
);
create table if not exists public.user_settings (
  user_id uuid primary key, full_name text, company_name text, website text,
  from_name text, from_email text, daily_limit int default 10000, batch_size int default 100,
  delay_between_batches int default 2, unsubscribe_link boolean default true,
  track_opens boolean default true, track_clicks boolean default true,
  updated_at timestamptz default now()
);
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  business_name text, contact_name text, email text, website text, plan text, use_case text,
  list_source text, monthly_volume text, notes text, status text default 'pending',
  created_at timestamptz default now()
);

-- ── Platform core ───────────────────────────────────────────────────────────────
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, description text,
  billing_period text not null default 'monthly' check (billing_period in ('monthly','annual')),
  price numeric(12,2) default 0, currency text default 'USD',
  email_credits bigint not null default 0, max_users int not null default 1,
  max_smtp int not null default 1, max_campaigns int not null default 10,
  features jsonb not null default '{"automation":true,"inbox":true,"ai":false,"api":false,"white_label":false}',
  is_active boolean not null default true, created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text unique,
  status text not null default 'active' check (status in ('active','suspended','deactivated')),
  website text, industry text, timezone text default 'UTC', address text, phone text,
  brand_name text, logo_url text, brand_color text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.org_subscriptions (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  plan_id uuid references public.plans(id),
  status text not null default 'active' check (status in ('active','suspended','expired','cancelled')),
  billing_period text not null default 'monthly',
  starts_at timestamptz not null default now(), expires_at timestamptz,
  email_credits_total bigint not null default 0, email_credits_used bigint not null default 0,
  max_users int not null default 1, max_smtp int not null default 1, max_campaigns int not null default 10,
  features jsonb not null default '{}',
  last_alert_pct int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.credit_ledger (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  delta bigint not null, reason text not null, campaign_id uuid, actor_id uuid,
  created_at timestamptz not null default now()
);
create index on public.credit_ledger (org_id, created_at desc);

create table public.credit_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  requested_by uuid default auth.uid(),
  kind text not null default 'credits' check (kind in ('credits','upgrade')),
  amount bigint, message text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  number text not null unique, description text, amount numeric(12,2) not null default 0,
  currency text default 'USD', status text not null default 'issued' check (status in ('draft','issued','paid','void')),
  issued_at date default current_date, due_at date, created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key,
  org_id uuid references public.organizations(id) on delete cascade,
  role text not null check (role in ('super_admin','client_admin','campaign_manager')),
  status text not null default 'active' check (status in ('active','suspended','deactivated')),
  email text not null, full_name text,
  permissions jsonb not null default '{}',
  must_change_password boolean not null default false,
  last_login_at timestamptz, created_by uuid,
  created_at timestamptz not null default now(),
  check ((role = 'super_admin') = (org_id is null))
);
create index on public.profiles (org_id);

-- ── Tenant columns on base tables ───────────────────────────────────────────────
alter table public.contact_lists
  add column if not exists org_id uuid references public.organizations(id) on delete cascade,
  add column if not exists category text,
  add column if not exists assigned_user_ids uuid[] not null default '{}';
alter table public.contact_lists alter column user_id set default auth.uid();

alter table public.contacts
  add column if not exists org_id uuid references public.organizations(id) on delete cascade,
  add column if not exists tags text[] not null default '{}',
  add column if not exists custom_fields jsonb not null default '{}',
  add column if not exists consent_status text not null default 'unknown',
  add column if not exists timezone text,
  add column if not exists engagement_score int not null default 0,
  add column if not exists last_engaged_at timestamptz;
alter table public.contacts alter column user_id set default auth.uid();
alter table public.contacts add column if not exists company text;

alter table public.templates
  add column if not exists org_id uuid references public.organizations(id) on delete cascade,
  add column if not exists builder_blocks jsonb;
alter table public.templates alter column user_id set default auth.uid();

alter table public.campaigns
  add column if not exists org_id uuid references public.organizations(id) on delete cascade,
  add column if not exists description text,
  add column if not exists subject_b text,
  add column if not exists html_override text,
  add column if not exists segment_tags text[] not null default '{}',
  add column if not exists assigned_user_ids uuid[] not null default '{}',
  add column if not exists send_mode text not null default 'single',
  add column if not exists timezone text default 'UTC',
  add column if not exists scheduled_at timestamptz,
  add column if not exists recipients_built_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists status_reason text,
  add column if not exists track_opens boolean not null default true,
  add column if not exists track_clicks boolean not null default true,
  add column if not exists duplicated_from uuid;
alter table public.campaigns alter column user_id set default auth.uid();

alter table public.email_logs
  add column if not exists org_id uuid references public.organizations(id) on delete cascade,
  add column if not exists smtp_account_id uuid;
alter table public.sender_emails
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.sender_emails alter column user_id set default auth.uid();

-- ── Email infrastructure ────────────────────────────────────────────────────────
create table public.domains (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  domain text not null, verification_token text not null,
  dkim_selector text not null default 'synerax', dkim_public_key text,
  verified boolean not null default false, spf_ok boolean not null default false,
  dkim_ok boolean not null default false, dmarc_ok boolean not null default false,
  dmarc_policy text, last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, domain)
);

create table public.smtp_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  label text not null, provider text default 'custom',
  host text not null, port int not null default 587, secure boolean not null default false,
  username text not null, from_name text, from_email text not null,
  hourly_limit int not null default 100, daily_limit int not null default 500, monthly_limit int not null default 10000,
  status text not null default 'untested' check (status in ('untested','healthy','degraded','paused')),
  consecutive_failures int not null default 0, last_error text, last_tested_at timestamptz,
  created_by uuid, created_at timestamptz not null default now()
);
create index on public.smtp_accounts (org_id);

-- No client grants or policies, ever: the worker alone holds ciphertext and key.
create table public.integration_secrets (
  owner_type text not null, owner_id uuid not null,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default 'password', ciphertext text not null,
  updated_at timestamptz not null default now(),
  primary key (owner_type, owner_id, name)
);

create table public.campaign_accounts (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  smtp_account_id uuid not null references public.smtp_accounts(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  daily_limit int, priority int not null default 0,
  primary key (campaign_id, smtp_account_id)
);

create table public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  email text not null, name text, variant text not null default 'A',
  smtp_account_id uuid references public.smtp_accounts(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','sending','sent','failed','skipped')),
  error text, message_id text, claimed_at timestamptz, sent_at timestamptz,
  first_opened_at timestamptz, open_count int not null default 0, machine_open_count int not null default 0,
  first_clicked_at timestamptz, click_count int not null default 0,
  bounce_type text check (bounce_type in ('hard','soft')), bounce_reason text, bounced_at timestamptz,
  unsubscribed_at timestamptz, complained_at timestamptz, replied_at timestamptz,
  unique (campaign_id, email)
);
create index on public.campaign_recipients (campaign_id, status);
create index on public.campaign_recipients (org_id, sent_at);
create index on public.campaign_recipients (smtp_account_id, sent_at);
create index on public.campaign_recipients (message_id);

create table public.email_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid, recipient_id uuid, contact_id uuid, smtp_account_id uuid,
  type text not null, detail jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
create index on public.email_events (org_id, occurred_at desc);
create index on public.email_events (campaign_id, occurred_at desc);
create index on public.email_events (contact_id, occurred_at desc);
create index on public.email_events (smtp_account_id, occurred_at desc);

create table public.suppressions (
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null, reason text not null
    check (reason in ('unsubscribe','hard_bounce','complaint','manual')),
  source text, created_at timestamptz not null default now(),
  primary key (org_id, email)
);

create table public.segments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  name text not null, filter jsonb not null default '{}', created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- ── Inbox ───────────────────────────────────────────────────────────────────────
create table public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  label text not null, email text not null,
  provider text not null default 'imap' check (provider in ('imap','gmail','graph')),
  imap_host text, imap_port int default 993, imap_secure boolean default true, username text,
  smtp_account_id uuid references public.smtp_accounts(id) on delete set null,
  status text not null default 'untested', last_error text, last_synced_at timestamptz, last_uid bigint default 0,
  created_at timestamptz not null default now()
);

create table public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  mailbox_id uuid references public.mailboxes(id) on delete cascade,
  folder text not null default 'inbox' check (folder in ('inbox','sent','drafts','archive','trash')),
  message_id text, in_reply_to text, thread_key text not null,
  from_address text, from_name text, to_addresses text[] not null default '{}', cc_addresses text[] not null default '{}',
  subject text, text_body text, html_body text, attachments jsonb not null default '[]',
  is_read boolean not null default false,
  campaign_id uuid references public.campaigns(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  sent_at timestamptz not null default now(), created_at timestamptz not null default now(),
  unique (mailbox_id, message_id)
);
create index on public.mail_messages (org_id, folder, sent_at desc);
create index on public.mail_messages (thread_key);

-- ── Automation ──────────────────────────────────────────────────────────────────
create table public.automations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  name text not null, description text,
  status text not null default 'draft' check (status in ('draft','active','paused')),
  trigger jsonb not null default '{"type":"list_join"}',
  steps jsonb not null default '[]',
  smtp_account_id uuid references public.smtp_accounts(id) on delete set null,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  automation_id uuid not null references public.automations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  step_index int not null default 0, status text not null default 'running'
    check (status in ('running','completed','stopped','failed')),
  next_run_at timestamptz not null default now(), last_sent_at timestamptz, last_message_id text,
  log jsonb not null default '[]', created_at timestamptz not null default now(),
  unique (automation_id, contact_id)
);
create index on public.automation_runs (status, next_run_at);

-- ── Support ─────────────────────────────────────────────────────────────────────
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  org_id uuid references public.organizations(id) on delete cascade,
  created_by uuid default auth.uid(), subject text not null, description text,
  category text not null default 'general', priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  status text not null default 'open'
    check (status in ('open','in_progress','waiting_client','resolved','closed')),
  assigned_to uuid, attachments jsonb not null default '[]',
  first_response_at timestamptz, resolved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.tickets (org_id, status);

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  org_id uuid, author_id uuid default auth.uid(), author_name text,
  body text not null, is_internal boolean not null default false,
  attachments jsonb not null default '[]', created_at timestamptz not null default now()
);
create index on public.ticket_messages (ticket_id, created_at);

-- ── Enterprise ──────────────────────────────────────────────────────────────────
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, key_prefix text not null, key_hash text not null unique,
  created_by uuid, last_used_at timestamptz, revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  url text not null, events text[] not null default '{}', is_active boolean not null default true,
  last_status int, last_delivery_at timestamptz, created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  org_id uuid, actor_id uuid, actor_email text, action text not null,
  entity text, entity_id text, detail jsonb not null default '{}', ip text,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (org_id, created_at desc);

create table public.login_history (
  id bigint generated always as identity primary key,
  user_id uuid not null, org_id uuid, ip text, user_agent text,
  created_at timestamptz not null default now()
);
create index on public.login_history (user_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid, user_id uuid, title text not null, body text, link text,
  severity text not null default 'info', read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

-- ── Identity helpers. SECURITY DEFINER so policies can read profiles without recursion. ─
create function public.current_profile() returns public.profiles
language sql stable security definer set search_path = '' as $$
  select p.* from public.profiles p
  left join public.organizations o on o.id = p.org_id
  where p.id = auth.uid() and p.status = 'active'
    and (p.org_id is null or o.status = 'active')
    -- A user with a verified TOTP factor gets nothing from an aal1 session.
    and (coalesce(auth.jwt()->>'aal','aal1') = 'aal2'
         or not exists (select 1 from auth.mfa_factors f where f.user_id = p.id and f.status = 'verified'))
$$;
create function public.current_org_id() returns uuid language sql stable security definer set search_path = '' as
  $$ select (public.current_profile()).org_id $$;
create function public.is_super_admin() returns boolean language sql stable security definer set search_path = '' as
  $$ select coalesce((public.current_profile()).role = 'super_admin', false) $$;
create function public.is_client_admin() returns boolean language sql stable security definer set search_path = '' as
  $$ select coalesce((public.current_profile()).role = 'client_admin', false) $$;
-- Org admins hold every permission; managers hold what their admin granted.
create function public.has_perm(p text) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select pr.role = 'client_admin' or (pr.role = 'campaign_manager' and (pr.permissions->>p)::boolean)
                   from public.current_profile() pr), false)
$$;
create function public.can_see_list(p_list uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.contact_lists l where l.id = p_list and l.org_id = public.current_org_id()
    and public.has_perm('contacts')
    and (public.is_client_admin() or l.user_id = auth.uid() or cardinality(l.assigned_user_ids) = 0 or auth.uid() = any(l.assigned_user_ids)))
$$;
create function public.can_see_campaign(p_campaign uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.campaigns c where c.id = p_campaign and c.org_id = public.current_org_id()
    and (public.is_client_admin() or (public.has_perm('campaigns') and (c.user_id = auth.uid() or auth.uid() = any(c.assigned_user_ids)))))
$$;

-- Readable even while an org is suspended, so the UI can explain the lockout.
create function public.get_my_context() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'profile', to_jsonb(p), 'organization', to_jsonb(o), 'subscription', to_jsonb(s),
    'plan_name', pl.name,
    'mfa_required', exists (select 1 from auth.mfa_factors f where f.user_id = p.id and f.status = 'verified')
                    and coalesce(auth.jwt()->>'aal','aal1') <> 'aal2')
  from public.profiles p
  left join public.organizations o on o.id = p.org_id
  left join public.org_subscriptions s on s.org_id = p.org_id
  left join public.plans pl on pl.id = s.plan_id
  where p.id = auth.uid()
$$;

-- First platform owner: run once by hand from the SQL editor.
create function public.bootstrap_super_admin(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if exists (select 1 from public.profiles where role = 'super_admin') then
    raise exception 'A super admin already exists';
  end if;
  select id into u from auth.users where lower(email) = lower(p_email);
  if u is null then raise exception 'No auth user with that email'; end if;
  delete from public.profiles where id = u;
  insert into public.profiles (id, org_id, role, email) values (u, null, 'super_admin', lower(p_email));
end $$;

-- ── Triggers ────────────────────────────────────────────────────────────────────
-- The client can never choose its own tenant: org_id is overwritten from the JWT.
create function public.force_org_id() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.org_id := public.current_org_id();
    if new.org_id is null then raise exception 'No active organization' using errcode = '42501'; end if;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['contact_lists','contacts','templates','campaigns','email_logs','sender_emails',
                           'segments','automations','credit_requests','tickets','campaign_accounts'] loop
    execute format('create trigger force_org before insert on public.%I for each row execute function public.force_org_id()', t);
  end loop;
end $$;

create function public.guard_org_update() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_super_admin()
     and (new.status is distinct from old.status or new.slug is distinct from old.slug) then
    raise exception 'Only Synerax can change organization status' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger guard_org before update on public.organizations for each row execute function public.guard_org_update();

create function public.enforce_campaign_limit() returns trigger language plpgsql security definer set search_path = '' as $$
declare s public.org_subscriptions;
begin
  select * into s from public.org_subscriptions where org_id = new.org_id;
  if s.org_id is not null and (select count(*) from public.campaigns c
       where c.org_id = new.org_id and c.created_at >= s.starts_at) >= s.max_campaigns then
    raise exception 'Campaign limit of % reached for this plan', s.max_campaigns using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger zz_campaign_limit before insert on public.campaigns for each row execute function public.enforce_campaign_limit();

create function public.notify_org_admins(p_org uuid, p_title text, p_body text, p_link text, p_severity text default 'info')
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (org_id, user_id, title, body, link, severity)
  select p_org, id, p_title, p_body, p_link, p_severity from public.profiles
  where org_id = p_org and role = 'client_admin' and status = 'active'
$$;

create function public.ticket_message_side_effects() returns trigger language plpgsql security definer set search_path = '' as $$
declare t public.tickets; staff boolean := public.is_super_admin();
begin
  select * into t from public.tickets where id = new.ticket_id;
  new.org_id := t.org_id;
  new.author_name := coalesce((select coalesce(full_name, email) from public.profiles where id = auth.uid()), new.author_name);
  if new.is_internal then return new; end if;
  if staff then
    update public.tickets set first_response_at = coalesce(first_response_at, now()),
      status = case when status in ('resolved','closed') then status else 'waiting_client' end, updated_at = now() where id = t.id;
    perform public.notify_org_admins(t.org_id, 'Synerax replied to ticket #' || t.number, t.subject, '/support/' || t.id);
  else
    update public.tickets set status = 'in_progress', resolved_at = null, updated_at = now() where id = t.id;
    insert into public.notifications (user_id, title, body, link)
      select id, 'Client replied on ticket #' || t.number, t.subject, '/support/' || t.id from public.profiles where role = 'super_admin';
  end if;
  return new;
end $$;
create trigger ticket_message_fx before insert on public.ticket_messages for each row execute function public.ticket_message_side_effects();

create function public.ticket_status_stamp() returns trigger language plpgsql as $$
begin
  if new.status in ('resolved','closed') and old.status not in ('resolved','closed') then new.resolved_at := now(); end if;
  new.updated_at := now();
  return new;
end $$;
create trigger ticket_stamp before update on public.tickets for each row execute function public.ticket_status_stamp();

-- Browser-originated changes only; the worker writes its own richer audit rows.
create function public.audit_row() returns trigger language plpgsql security definer set search_path = '' as $$
declare rec jsonb := to_jsonb(coalesce(new, old));
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  insert into public.audit_logs (org_id, actor_id, actor_email, action, entity, entity_id, detail)
  values (coalesce((rec->>'org_id')::uuid, case when tg_table_name = 'organizations' then (rec->>'id')::uuid end),
          auth.uid(), auth.jwt()->>'email', lower(tg_op), tg_table_name, coalesce(rec->>'id', rec->>'org_id'),
          case when tg_op = 'UPDATE' then jsonb_build_object('status', rec->>'status') else '{}'::jsonb end);
  return coalesce(new, old);
end $$;
do $$
declare t text;
begin
  foreach t in array array['organizations','org_subscriptions','plans','campaigns','automations','suppressions','tickets','webhook_endpoints'] loop
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- ── Worker-only RPCs ────────────────────────────────────────────────────────────
-- Grants at most p_n credits; an expired or suspended subscription grants zero.
create function public.consume_credits(p_org uuid, p_n int, p_campaign uuid default null) returns int
language plpgsql security definer set search_path = '' as $$
declare s public.org_subscriptions; granted int; pct int;
begin
  select * into s from public.org_subscriptions where org_id = p_org for update;
  if s.org_id is null or s.status <> 'active' or (s.expires_at is not null and s.expires_at < now())
     or (select status from public.organizations where id = p_org) <> 'active' then return 0; end if;
  granted := greatest(0, least(p_n::bigint, s.email_credits_total - s.email_credits_used))::int;
  if granted = 0 then return 0; end if;
  update public.org_subscriptions set email_credits_used = email_credits_used + granted where org_id = p_org;
  insert into public.credit_ledger (org_id, delta, reason, campaign_id) values (p_org, -granted, 'send', p_campaign);
  if s.email_credits_total > 0 then
    pct := ((s.email_credits_used + granted) * 100 / s.email_credits_total)::int;
    if pct >= 80 and s.last_alert_pct < 80 or pct >= 95 and s.last_alert_pct < 95 then
      update public.org_subscriptions set last_alert_pct = pct where org_id = p_org;
      perform public.notify_org_admins(p_org, 'Email credits at ' || pct || '%',
        'Request more credits from Synerax before sending stops.', '/usage', 'warning');
    end if;
  end if;
  return granted;
end $$;

create function public.refund_credits(p_org uuid, p_n int, p_campaign uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_n <= 0 then return; end if;
  update public.org_subscriptions set email_credits_used = greatest(0, email_credits_used - p_n) where org_id = p_org;
  insert into public.credit_ledger (org_id, delta, reason, campaign_id) values (p_org, p_n, 'refund', p_campaign);
end $$;

-- Super-admin grant or deduction: moves the total, so usage history stays true.
create function public.adjust_credits(p_org uuid, p_delta bigint, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.org_subscriptions set email_credits_total = greatest(email_credits_used, email_credits_total + p_delta), last_alert_pct = 0
    where org_id = p_org;
  insert into public.credit_ledger (org_id, delta, reason, actor_id) values (p_org, p_delta, coalesce(p_reason,'manual adjustment'), auth.uid());
end $$;

-- Dedupes by address and drops suppressed/unsubscribed contacts before anything queues.
create function public.build_campaign_recipients(p_campaign uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare c public.campaigns; ids uuid[]; n int;
begin
  select * into c from public.campaigns where id = p_campaign;
  ids := case when cardinality(c.list_ids) > 0 then c.list_ids when c.list_id is not null then array[c.list_id] else '{}' end;
  insert into public.campaign_recipients (org_id, campaign_id, contact_id, email, name, variant)
  select c.org_id, c.id, d.id, d.email, d.name,
         case when c.subject_b is not null and c.subject_b <> '' and row_number() over (order by d.id) % 2 = 0 then 'B' else 'A' end
  from (select distinct on (lower(ct.email)) ct.id, lower(ct.email) as email, ct.name
        from public.contacts ct
        where ct.org_id = c.org_id and ct.list_id = any(ids) and ct.status = 'active'
          and ct.consent_status <> 'denied'
          and (cardinality(c.segment_tags) = 0 or ct.tags && c.segment_tags)
          and not exists (select 1 from public.suppressions s where s.org_id = c.org_id and s.email = lower(ct.email))
        order by lower(ct.email), ct.created_at) d
  on conflict (campaign_id, email) do nothing;
  get diagnostics n = row_count;
  update public.campaigns set recipients_built_at = now() where id = c.id;
  return n;
end $$;

-- SKIP LOCKED keeps two worker instances from ever sending to one recipient.
create function public.claim_recipients(p_campaign uuid, p_limit int) returns setof public.campaign_recipients
language sql security definer set search_path = '' as $$
  update public.campaign_recipients r set status = 'sending', claimed_at = now()
  where r.id in (select id from public.campaign_recipients
                 where campaign_id = p_campaign and status = 'pending'
                 limit p_limit for update skip locked)
  returning r.*
$$;

-- At-most-once: an interrupted send is failed, not retried, so nobody is mailed twice.
create function public.reap_stale_recipients() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.campaign_recipients set status = 'failed', error = 'Worker interrupted during send'
  where status = 'sending' and claimed_at < now() - interval '15 minutes';
  get diagnostics n = row_count;
  return n;
end $$;

create function public.bump_engagement(p_contact uuid, p_points int) returns void
language sql security definer set search_path = '' as $$
  update public.contacts set engagement_score = least(100, greatest(0, engagement_score + p_points)), last_engaged_at = now() where id = p_contact
$$;

-- Single entry point for engagement, so suppression can never be forgotten by a caller.
create function public.apply_contact_effects(p_org uuid, p_email text, p_contact uuid, p_type text, p_source text)
returns void language plpgsql security definer set search_path = '' as $$
declare reason text := case p_type when 'unsubscribe' then 'unsubscribe' when 'complaint' then 'complaint' when 'hard_bounce' then 'hard_bounce' end;
begin
  if reason is not null then
    insert into public.suppressions (org_id, email, reason, source) values (p_org, lower(p_email), reason, p_source)
      on conflict (org_id, email) do nothing;
    update public.contacts set status = case when p_type = 'unsubscribe' then 'unsubscribed' when p_type = 'complaint' then 'unsubscribed' else 'bounced' end
      where org_id = p_org and lower(email) = lower(p_email);
    update public.automation_runs r set status = 'stopped' from public.contacts c
      where r.contact_id = c.id and c.org_id = p_org and lower(c.email) = lower(p_email) and r.status = 'running';
  elsif p_contact is not null then
    perform public.bump_engagement(p_contact, case p_type when 'open' then 1 when 'click' then 5 when 'reply' then 10 else 0 end);
  end if;
end $$;

create function public.track_engagement(p_recipient uuid, p_type text, p_machine boolean default false, p_detail jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare r public.campaign_recipients;
begin
  update public.campaign_recipients x set
    open_count = x.open_count + (p_type = 'open' and not p_machine)::int,
    machine_open_count = x.machine_open_count + (p_type = 'open' and p_machine)::int,
    first_opened_at = case when p_type = 'open' and not p_machine then coalesce(x.first_opened_at, now()) else x.first_opened_at end,
    click_count = x.click_count + (p_type = 'click' and not p_machine)::int,
    first_clicked_at = case when p_type = 'click' and not p_machine then coalesce(x.first_clicked_at, now()) else x.first_clicked_at end,
    unsubscribed_at = case when p_type = 'unsubscribe' then coalesce(x.unsubscribed_at, now()) else x.unsubscribed_at end,
    complained_at = case when p_type = 'complaint' then coalesce(x.complained_at, now()) else x.complained_at end,
    replied_at = case when p_type = 'reply' then coalesce(x.replied_at, now()) else x.replied_at end,
    bounced_at = case when p_type in ('hard_bounce','soft_bounce') then coalesce(x.bounced_at, now()) else x.bounced_at end,
    bounce_type = case p_type when 'hard_bounce' then 'hard' when 'soft_bounce' then 'soft' else x.bounce_type end,
    bounce_reason = coalesce(p_detail->>'reason', x.bounce_reason)
  where x.id = p_recipient returning x.* into r;
  if r.id is null then return; end if;
  insert into public.email_events (org_id, campaign_id, recipient_id, contact_id, smtp_account_id, type, detail)
    values (r.org_id, r.campaign_id, r.id, r.contact_id, r.smtp_account_id, p_type, p_detail || jsonb_build_object('machine', p_machine));
  if not p_machine then perform public.apply_contact_effects(r.org_id, r.email, r.contact_id, p_type, 'campaign:' || r.campaign_id); end if;
end $$;

create function public.track_automation_event(p_run uuid, p_type text, p_machine boolean default false, p_detail jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare ar public.automation_runs; ct public.contacts;
begin
  select * into ar from public.automation_runs where id = p_run;
  if ar.id is null then return; end if;
  select * into ct from public.contacts where id = ar.contact_id;
  insert into public.email_events (org_id, contact_id, type, detail)
    values (ar.org_id, ar.contact_id, p_type, p_detail || jsonb_build_object('machine', p_machine, 'automation_run', ar.id, 'automation_id', ar.automation_id));
  if not p_machine then perform public.apply_contact_effects(ar.org_id, ct.email, ct.id, p_type, 'automation:' || ar.automation_id); end if;
end $$;

-- ── Metric views: security_invoker, so RLS on the recipients applies to the caller ─
create view public.campaign_metrics with (security_invoker = true) as
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
  count(*) filter (where r.replied_at is not null)           as replies
from public.campaign_recipients r group by r.campaign_id, r.org_id;

create view public.variant_metrics with (security_invoker = true) as
select campaign_id, variant, count(*) filter (where status = 'sent') as sent,
  count(*) filter (where first_opened_at is not null) as unique_opens,
  count(*) filter (where first_clicked_at is not null) as unique_clicks
from public.campaign_recipients group by campaign_id, variant;

create view public.smtp_metrics with (security_invoker = true) as
select r.smtp_account_id, r.org_id,
  count(*) filter (where r.status = 'sent') as sent,
  count(*) filter (where r.status = 'failed') as failed,
  count(*) filter (where r.bounced_at is not null) as bounced,
  count(*) filter (where r.first_opened_at is not null) as unique_opens,
  count(*) filter (where r.first_clicked_at is not null) as unique_clicks,
  count(*) filter (where r.complained_at is not null) as complaints,
  count(*) filter (where r.sent_at >= date_trunc('day', now())) as sent_today
from public.campaign_recipients r where r.smtp_account_id is not null group by r.smtp_account_id, r.org_id;

create view public.daily_stats with (security_invoker = true) as
select r.org_id, r.sent_at::date as day,
  count(*) filter (where r.status = 'sent') as sent,
  count(*) filter (where r.status = 'sent' and r.bounced_at is null) as delivered,
  count(*) filter (where r.first_opened_at is not null) as opened,
  count(*) filter (where r.first_clicked_at is not null) as clicked,
  count(*) filter (where r.bounced_at is not null) as bounced
from public.campaign_recipients r where r.sent_at is not null group by r.org_id, r.sent_at::date;

create view public.org_metrics with (security_invoker = true) as
select org_id, sum(total_scheduled) as total_scheduled, sum(sent) as sent, sum(delivered) as delivered,
  sum(unique_opens) as unique_opens, sum(unique_clicks) as unique_clicks, sum(bounced) as bounced,
  sum(complaints) as complaints, count(*) as campaigns_sent
from public.campaign_metrics group by org_id;

-- ── RLS: default-deny everything, then open only what each role needs ───────────
do $$
declare t text;
begin
  foreach t in array array[
    'contact_lists','contacts','templates','campaigns','email_logs','sender_emails','user_settings','applications',
    'plans','organizations','org_subscriptions','credit_ledger','credit_requests','invoices','profiles',
    'domains','smtp_accounts','integration_secrets','campaign_accounts','campaign_recipients','email_events',
    'suppressions','segments','mailboxes','mail_messages','automations','automation_runs','tickets','ticket_messages',
    'api_keys','webhook_endpoints','audit_logs','login_history','notifications'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Tenant data. contact_lists and campaigns inline their visibility rule: a STABLE helper
-- cannot see a row inserted by the same statement, which would break INSERT ... RETURNING.
create policy tenant_read on public.contact_lists for select to authenticated using ((select public.is_super_admin()) or org_id = (select public.current_org_id()) and (select public.has_perm('contacts')) and ((select public.is_client_admin()) or user_id = auth.uid() or cardinality(assigned_user_ids) = 0 or auth.uid() = any(assigned_user_ids)));
create policy tenant_ins  on public.contact_lists for insert to authenticated with check (org_id = (select public.current_org_id()) and (select public.has_perm('contacts')));
create policy tenant_upd  on public.contact_lists for update to authenticated using (org_id = (select public.current_org_id()) and (select public.has_perm('contacts')) and ((select public.is_client_admin()) or user_id = auth.uid() or cardinality(assigned_user_ids) = 0 or auth.uid() = any(assigned_user_ids))) with check (org_id = (select public.current_org_id()));
create policy tenant_del  on public.contact_lists for delete to authenticated using (org_id = (select public.current_org_id()) and (select public.has_perm('contacts')) and ((select public.is_client_admin()) or user_id = auth.uid() or cardinality(assigned_user_ids) = 0 or auth.uid() = any(assigned_user_ids)));

create policy tenant_read on public.contacts for select to authenticated using ((select public.is_super_admin()) or (select public.is_client_admin()) and org_id = (select public.current_org_id()) or public.can_see_list(list_id));
create policy tenant_ins  on public.contacts for insert to authenticated with check (org_id = (select public.current_org_id()) and ((select public.is_client_admin()) or public.can_see_list(list_id)));
create policy tenant_upd  on public.contacts for update to authenticated using ((select public.is_client_admin()) and org_id = (select public.current_org_id()) or public.can_see_list(list_id)) with check (org_id = (select public.current_org_id()));
create policy tenant_del  on public.contacts for delete to authenticated using ((select public.is_client_admin()) and org_id = (select public.current_org_id()) or public.can_see_list(list_id));

create policy tenant_read on public.templates for select to authenticated using ((select public.is_super_admin()) or org_id = (select public.current_org_id()) and (select public.has_perm('templates')));
create policy tenant_ins  on public.templates for insert to authenticated with check (org_id = (select public.current_org_id()) and (select public.has_perm('templates')));
create policy tenant_upd  on public.templates for update to authenticated using (org_id = (select public.current_org_id()) and (select public.has_perm('templates'))) with check (org_id = (select public.current_org_id()));
create policy tenant_del  on public.templates for delete to authenticated using (org_id = (select public.current_org_id()) and (select public.has_perm('templates')));

create policy tenant_read on public.campaigns for select to authenticated using ((select public.is_super_admin()) or org_id = (select public.current_org_id()) and ((select public.is_client_admin()) or (select public.has_perm('campaigns')) and (user_id = auth.uid() or auth.uid() = any(assigned_user_ids))));
create policy tenant_ins  on public.campaigns for insert to authenticated with check (org_id = (select public.current_org_id()) and (select public.has_perm('campaigns')) and status = 'draft');
create policy tenant_upd  on public.campaigns for update to authenticated using (org_id = (select public.current_org_id()) and ((select public.is_client_admin()) or (select public.has_perm('campaigns')) and (user_id = auth.uid() or auth.uid() = any(assigned_user_ids)))) with check (org_id = (select public.current_org_id()));
create policy tenant_del  on public.campaigns for delete to authenticated using (org_id = (select public.current_org_id()) and ((select public.is_client_admin()) or (select public.has_perm('campaigns')) and (user_id = auth.uid() or auth.uid() = any(assigned_user_ids))) and status in ('draft','completed','stopped','failed'));

create policy tenant_read on public.campaign_accounts for select to authenticated using (public.can_see_campaign(campaign_id));
create policy tenant_ins  on public.campaign_accounts for insert to authenticated with check (public.can_see_campaign(campaign_id)
  and exists (select 1 from public.smtp_accounts a where a.id = smtp_account_id and a.org_id = (select public.current_org_id())));
create policy tenant_upd  on public.campaign_accounts for update to authenticated using (public.can_see_campaign(campaign_id)) with check (public.can_see_campaign(campaign_id));
create policy tenant_del  on public.campaign_accounts for delete to authenticated using (public.can_see_campaign(campaign_id));

create policy tenant_read on public.campaign_recipients for select to authenticated using ((select public.is_super_admin()) or public.can_see_campaign(campaign_id));
create policy tenant_read on public.email_events for select to authenticated using ((select public.is_super_admin()) or org_id = (select public.current_org_id()) and ((select public.is_client_admin()) or campaign_id is not null and public.can_see_campaign(campaign_id)));
create policy tenant_read on public.email_logs for select to authenticated using ((select public.is_super_admin()) or org_id = (select public.current_org_id()) and (select public.has_perm('analytics')));

-- Sender identities: managers read, the admin writes; OTP columns are never granted.
create policy tenant_read on public.sender_emails for select to authenticated using (org_id = (select public.current_org_id()));
create policy tenant_del  on public.sender_emails for delete to authenticated using (org_id = (select public.current_org_id()) and (select public.is_client_admin()));

create policy own_settings on public.user_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy apply_public on public.applications for insert to anon, authenticated with check (status = 'pending');
create policy admin_read on public.applications for select to authenticated using ((select public.is_super_admin()));
create policy admin_upd  on public.applications for update to authenticated using ((select public.is_super_admin()));

-- Organization, plans, subscriptions: Synerax writes, clients read their own
create policy org_read on public.organizations for select to authenticated using ((select public.is_super_admin()) or id = (select public.current_org_id()));
create policy org_upd  on public.organizations for update to authenticated using ((select public.is_super_admin()) or id = (select public.current_org_id()) and (select public.is_client_admin()));
create policy plans_read on public.plans for select to authenticated using ((select public.is_super_admin()));
create policy plans_write on public.plans for all to authenticated using ((select public.is_super_admin())) with check ((select public.is_super_admin()));
create policy sub_read on public.org_subscriptions for select to authenticated using ((select public.is_super_admin()) or org_id = (select public.current_org_id()) and (select public.is_client_admin()));
create policy sub_write on public.org_subscriptions for all to authenticated using ((select public.is_super_admin())) with check ((select public.is_super_admin()));
create policy ledger_read on public.credit_ledger for select to authenticated using ((select public.is_super_admin()) or org_id = (select public.current_org_id()) and (select public.is_client_admin()));
create policy req_read on public.credit_requests for select to authenticated using ((select public.is_super_admin()) or org_id = (select public.current_org_id()) and (select public.is_client_admin()));
create policy req_ins  on public.credit_requests for insert to authenticated with check (org_id = (select public.current_org_id()) and (select public.is_client_admin()));
create policy req_upd  on public.credit_requests for update to authenticated using ((select public.is_super_admin()));
create policy inv_read on public.invoices for select to authenticated using ((select public.is_super_admin()) or org_id = (select public.current_org_id()) and (select public.is_client_admin()));
create policy inv_write on public.invoices for all to authenticated using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

create policy profile_read on public.profiles for select to authenticated using (id = auth.uid() or (select public.is_super_admin()) or org_id = (select public.current_org_id()) and (select public.is_client_admin()));
create policy profile_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Infrastructure: admin-managed, secrets elsewhere, writes go through the worker
create policy tenant_read on public.domains for select to authenticated using ((select public.is_super_admin()) or org_id = (select public.current_org_id()) and (select public.is_client_admin()));
create policy tenant_read on public.smtp_accounts for select to authenticated using ((select public.is_super_admin()) or org_id = (select public.current_org_id()) and (select public.has_perm('campaigns')));
create policy tenant_read on public.mailboxes for select to authenticated using (org_id = (select public.current_org_id()) and (select public.has_perm('inbox')));
create policy tenant_read on public.mail_messages for select to authenticated using (org_id = (select public.current_org_id()) and (select public.has_perm('inbox')));
create policy tenant_upd on public.mail_messages for update to authenticated using (org_id = (select public.current_org_id()) and (select public.has_perm('inbox'))) with check (org_id = (select public.current_org_id()));
create policy tenant_read on public.api_keys for select to authenticated using (org_id = (select public.current_org_id()) and (select public.is_client_admin()));
create policy tenant_read on public.webhook_endpoints for select to authenticated using (org_id = (select public.current_org_id()) and (select public.is_client_admin()));

create policy tenant_read on public.suppressions for select to authenticated using (org_id = (select public.current_org_id()) and (select public.has_perm('contacts')));
create policy tenant_ins on public.suppressions for insert to authenticated with check (org_id = (select public.current_org_id()) and (select public.has_perm('contacts')) and reason = 'manual');
create policy tenant_del on public.suppressions for delete to authenticated using (org_id = (select public.current_org_id()) and (select public.is_client_admin()) and reason = 'manual');

create policy tenant_all on public.segments for all to authenticated using (org_id = (select public.current_org_id()) and (select public.has_perm('contacts'))) with check (org_id = (select public.current_org_id()));
create policy tenant_all on public.automations for all to authenticated using (org_id = (select public.current_org_id()) and (select public.has_perm('automation'))) with check (org_id = (select public.current_org_id()));
create policy tenant_read on public.automation_runs for select to authenticated using (org_id = (select public.current_org_id()) and (select public.has_perm('automation')));

-- Support: internal notes are invisible to clients at the database, not just in the UI
create policy ticket_read on public.tickets for select to authenticated using ((select public.is_super_admin()) or org_id = (select public.current_org_id()) and (select public.has_perm('support')));
create policy ticket_ins on public.tickets for insert to authenticated with check (org_id = (select public.current_org_id()) and (select public.has_perm('support')));
create policy ticket_upd on public.tickets for update to authenticated using ((select public.is_super_admin()));
create policy msg_read on public.ticket_messages for select to authenticated using ((select public.is_super_admin())
  or not is_internal and exists (select 1 from public.tickets t where t.id = ticket_id and t.org_id = (select public.current_org_id()) and (select public.has_perm('support'))));
create policy msg_ins on public.ticket_messages for insert to authenticated with check ((select public.is_super_admin())
  or not is_internal and exists (select 1 from public.tickets t where t.id = ticket_id and t.org_id = (select public.current_org_id()) and (select public.has_perm('support'))));

create policy audit_read on public.audit_logs for select to authenticated using ((select public.is_super_admin()) or org_id = (select public.current_org_id()) and (select public.is_client_admin()));
create policy login_read on public.login_history for select to authenticated using (user_id = auth.uid() or (select public.is_super_admin()) or org_id = (select public.current_org_id()) and (select public.is_client_admin()));
create policy notif_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_upd on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Supabase grants anon and authenticated everything on new objects by default, views included.
revoke all on public.campaign_metrics, public.variant_metrics, public.smtp_metrics, public.daily_stats, public.org_metrics from anon, authenticated;

-- ── Grants: the second lock. Columns not listed cannot be read or written at all ─
grant insert on public.applications to anon, authenticated;
grant select, update (status) on public.applications to authenticated;

grant select, insert, update, delete on public.contact_lists, public.contacts, public.templates, public.segments, public.automations to authenticated;
grant select, insert, update, delete on public.campaign_accounts to authenticated;
grant select, insert, delete on public.suppressions to authenticated;
grant select on public.campaign_recipients, public.email_events, public.email_logs, public.credit_ledger, public.domains,
  public.smtp_accounts, public.mailboxes, public.automation_runs, public.audit_logs, public.login_history to authenticated;
grant select on public.campaign_metrics, public.variant_metrics, public.smtp_metrics, public.daily_stats, public.org_metrics to authenticated;

-- Status, counters and queue fields move only through the worker, which checks credits and limits.
grant select, insert, delete on public.campaigns to authenticated;
grant update (name, description, subject, subject_b, template_id, list_id, list_ids, segment_tags, html_override,
              from_name, from_email, assigned_user_ids, send_mode, timezone, scheduled_at, track_opens, track_clicks)
  on public.campaigns to authenticated;

grant select (id, org_id, user_id, email, name, is_verified, created_at), delete on public.sender_emails to authenticated;

grant select (user_id, full_name, company_name, website, from_name, from_email, daily_limit, batch_size,
              delay_between_batches, unsubscribe_link, track_opens, track_clicks, updated_at),
      insert (user_id, full_name, company_name, website, from_name, from_email, daily_limit, batch_size,
              delay_between_batches, unsubscribe_link, track_opens, track_clicks, updated_at),
      update (full_name, company_name, website, from_name, from_email, daily_limit, batch_size,
              delay_between_batches, unsubscribe_link, track_opens, track_clicks, updated_at)
  on public.user_settings to authenticated;

grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.plans, public.org_subscriptions, public.invoices to authenticated;
grant select, insert, update on public.credit_requests to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

grant select (id, org_id, name, key_prefix, created_by, last_used_at, revoked_at, created_at) on public.api_keys to authenticated;
grant select on public.webhook_endpoints to authenticated;

grant select, update (folder, is_read) on public.mail_messages to authenticated;
grant select on public.tickets to authenticated;
grant insert (subject, description, category, priority, attachments, org_id) on public.tickets to authenticated;
grant update (status, priority, assigned_to) on public.tickets to authenticated;
grant select, insert on public.ticket_messages to authenticated;
grant select, update (read_at) on public.notifications to authenticated;

-- ── Function execute rights ─────────────────────────────────────────────────────
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.current_profile(), public.current_org_id(), public.is_super_admin(), public.is_client_admin(),
  public.has_perm(text), public.can_see_list(uuid), public.can_see_campaign(uuid), public.get_my_context(),
  public.adjust_credits(uuid, bigint, text) to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on all functions in schema public to service_role';
    execute 'grant all on all tables in schema public to service_role';
  end if;
end $$;

-- ── Private attachment storage (Supabase only) ──────────────────────────────────
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('ticket-attachments', 'ticket-attachments', false, 10485760,
            array['image/png','image/jpeg','image/webp','application/pdf','text/plain','text/csv'])
    on conflict (id) do nothing;
    execute $p$create policy ticket_files_read on storage.objects for select to authenticated using (
      bucket_id = 'ticket-attachments' and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_org_id()::text))$p$;
    execute $p$create policy ticket_files_write on storage.objects for insert to authenticated with check (
      bucket_id = 'ticket-attachments' and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_org_id()::text))$p$;
  end if;
end $$;

-- ── Segmentation data, conversions, A/B on content and send time ────────────────
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
