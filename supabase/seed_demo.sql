-- Demo logins for testing. Run once in the Supabase SQL Editor, AFTER schema.sql.
-- These passwords are public in this repo: never run this on a project with real clients.
-- To remove the demo data afterwards, see the commented block at the end.

do $$
declare
  demo_plan uuid;
  org_a uuid;
  org_b uuid;
  -- email, password, full name, role ('A'/'B' picks the company below)
  u record;
  new_id uuid;
begin
  if exists (select 1 from auth.users where email like '%@example.com' and email like 'demo.%') then
    raise exception 'Demo users already exist';
  end if;

  insert into public.plans (name, description, email_credits, max_users, max_smtp, max_campaigns, features)
  values ('Demo Plan', 'For testing only', 10000, 5, 5, 50, '{"automation":true,"inbox":true,"ai":true,"api":true,"white_label":true}')
  returning id into demo_plan;

  insert into public.organizations (name, industry, timezone, address)
  values ('Demo Company A', 'Retail', 'Asia/Kolkata', '1 Demo Road, Pune') returning id into org_a;
  insert into public.organizations (name, industry, timezone, address)
  values ('Demo Company B', 'Software', 'Asia/Kolkata', '2 Demo Road, Delhi') returning id into org_b;

  insert into public.org_subscriptions (org_id, plan_id, email_credits_total, max_users, max_smtp, max_campaigns, features, expires_at)
  select o, demo_plan, 10000, 5, 5, 50, '{"automation":true,"inbox":true,"ai":true,"api":true,"white_label":true}'::jsonb, now() + interval '1 year'
  from unnest(array[org_a, org_b]) as o;

  for u in
    select * from (values
      ('demo.superadmin@example.com', 'Demo-Super-2026!',   'Demo Super Admin',   'super_admin',      null::uuid, '{}'::jsonb),
      ('demo.admin.a@example.com',    'Demo-AdminA-2026!',  'Demo Admin A',       'client_admin',     org_a,      '{}'::jsonb),
      ('demo.manager.a@example.com',  'Demo-ManagerA-2026!','Demo Manager A',     'campaign_manager', org_a,      '{"campaigns":true,"contacts":true,"templates":true,"analytics":true,"automation":false,"inbox":false,"support":false}'::jsonb),
      ('demo.admin.b@example.com',    'Demo-AdminB-2026!',  'Demo Admin B',       'client_admin',     org_b,      '{}'::jsonb)
    ) as t(email, password, full_name, role, org_id, permissions)
  loop
    new_id := gen_random_uuid();

    -- Token columns must be '' rather than NULL, or Supabase Auth fails at sign-in.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated', u.email,
      extensions.crypt(u.password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.full_name), now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (new_id::text, new_id, jsonb_build_object('sub', new_id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now());

    insert into public.profiles (id, org_id, role, email, full_name, permissions)
    values (new_id, u.org_id, u.role, u.email, u.full_name, u.permissions);
  end loop;
end $$;

-- Remove all demo data:
-- delete from public.organizations where name like 'Demo Company %';
-- delete from public.plans where name = 'Demo Plan';
-- delete from public.profiles where email like 'demo.%@example.com';
-- delete from auth.users where email like 'demo.%@example.com';
