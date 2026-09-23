begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;
select plan(15);

insert into auth.users (id, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated');

select ok(not has_table_privilege('anon', 'public.learners', 'SELECT'), 'Signed-out requests cannot read learners');
select ok(not has_table_privilege('anon', 'public.learners', 'INSERT'), 'Signed-out requests cannot create learners');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select lives_ok($$
  insert into public.learners (id, name, date_of_birth, country, state, acknowledgements, requirements_version, agreement_version)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Test Learner', '2000-04-16', 'AU', 'VIC',
    '{"permit":true}', 'vic-learner-2026-09-23-v2', 'demo-v1')
$$, 'Supervisor can create their own learner');
select is((select count(*)::integer from public.learners), 1, 'Supervisor can read their learner');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select is((select count(*)::integer from public.learners), 0, 'Another supervisor cannot see the learner');

select throws_ok($$
  insert into public.learners (id, account_id, name, date_of_birth, country, state, acknowledgements, requirements_version, agreement_version)
  values (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'Test Learner', '2000-04-16', 'AU', 'VIC',
    '{"permit":true}', 'vic-learner-2026-09-23-v2', 'demo-v1')
$$, '42501', null, 'Cannot create a learner for a different supervisor');

select throws_ok($$
  insert into public.learners (id, name, date_of_birth, country, state, acknowledgements, requirements_version, agreement_version)
  values (gen_random_uuid(), 'Too Young', current_date, 'AU', 'VIC',
    '{"permit":true}', 'vic-learner-2026-09-23-v2', 'demo-v1')
$$, '23514', null, 'Database rejects an underage learner');

select throws_ok($$
  insert into public.learners (id, name, date_of_birth, country, state, acknowledgements, requirements_version, agreement_version)
  values (gen_random_uuid(), 'Wrong State', '2000-04-16', 'AU', 'NSW',
    '{"permit":true}', 'vic-learner-2026-09-23-v2', 'demo-v1')
$$, '23514', null, 'Database rejects unsupported location');

select throws_ok($$
  insert into public.learners (id, name, date_of_birth, country, state, acknowledgements, requirements_version, agreement_version)
  values (gen_random_uuid(), 'Unchecked', '2000-04-16', 'AU', 'VIC',
    '{"permit":false}', 'vic-learner-2026-09-23-v2', 'demo-v1')
$$, '23514', null, 'Database requires the permit confirmation');

select throws_ok($$
  insert into public.learners (id, name, date_of_birth, country, state, acknowledgements, requirements_version, agreement_version, accepted_at)
  values (gen_random_uuid(), 'Forged Timestamp', '2000-04-16', 'AU', 'VIC',
    '{"permit":true}', 'vic-learner-2026-09-23-v2', 'demo-v1', '2000-01-01')
$$, '42501', null, 'Acceptance timestamps are controlled by the server');

select throws_ok($$ update public.learners set account_id = auth.uid() $$,
  '42501', null, 'Client cannot change learner ownership');
select throws_ok($$ delete from public.learners $$,
  '42501', null, 'Deletion is not exposed in this create-and-read demo');

select lives_ok($$
  insert into public.learners (id, name, date_of_birth, country, state, acknowledgements, requirements_version, agreement_version)
  values (gen_random_uuid(), 'Earlier Checklist', '2000-04-16', 'AU', 'VIC',
    '{"permit":true,"plates":true,"supervision":true,"safe_driving":true,"devices":true}', 'vic-car-2026-09-23', 'demo-v1')
$$, 'Earlier checklist records remain valid');

select throws_ok($$
  insert into public.learners (id, name, date_of_birth, country, state, acknowledgements, requirements_version, agreement_version)
  values (gen_random_uuid(), 'Extra Driving Check', '2000-04-16', 'AU', 'VIC',
    '{"permit":true,"plates":true}', 'vic-learner-2026-09-23-v2', 'demo-v1')
$$, '23514', null, 'New profiles do not record practice confirmations');

select throws_ok($$
  insert into public.learners (id, name, date_of_birth, country, state, acknowledgements, requirements_version, agreement_version)
  values (gen_random_uuid(), 'Missing Permit', '2000-04-16', 'AU', 'VIC',
    '{}', 'vic-learner-2026-09-23-v2', 'demo-v1')
$$, '23514', null, 'A missing permit confirmation is rejected');

select * from finish();
rollback;
