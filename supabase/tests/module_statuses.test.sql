begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;
select plan(15);

insert into auth.users (id, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated');
insert into public.learners (id, account_id, name, date_of_birth, country, state, acknowledgements, requirements_version, agreement_version)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
  'Test Learner', '2000-04-16', 'AU', 'VIC', '{"permit":true}', 'vic-learner-2026-09-23-v2', 'demo-v1');

select ok(not has_table_privilege('anon', 'public.learner_module_statuses', 'SELECT'), 'Signed-out clients cannot read statuses');
select ok(not has_function_privilege('anon', 'public.set_learner_module_status(uuid,text,text)', 'EXECUTE'), 'Signed-out clients cannot save statuses');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is((select count(*)::integer from public.learner_module_statuses), 0, 'New learners have no assessment records');
select is((select status from public.set_learner_module_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'turns', 'excellent')), 'excellent', 'Can assess Excellent directly without practice');
select is((select status from public.set_learner_module_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'turns', 'needs_practice')), 'needs_practice', 'Can change Excellent to Need practice');
select is((select status from public.set_learner_module_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'turns', 'not_performed')), 'not_performed', 'Can reset to Not performed');
select is((select count(*)::integer from public.learner_module_statuses), 1, 'Changes update the current assessment');
select is((select updated_at from public.set_learner_module_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'turns', 'not_performed')),
  (select updated_at from public.learner_module_statuses where module_id = 'turns'), 'Repeating a save preserves its timestamp');
select throws_ok($$select * from public.set_learner_module_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'unknown', 'excellent')$$,
  '23514', null, 'Rejects unknown modules');
select throws_ok($$select * from public.set_learner_module_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'turns', 'completed')$$,
  '23514', null, 'Rejects unknown statuses');
select throws_ok($$update public.learner_module_statuses set account_id = '22222222-2222-4222-8222-222222222222'$$,
  '42501', null, 'Ownership cannot be reassigned');
select throws_ok($$update public.learner_module_statuses set updated_at = '2000-01-01'$$,
  '42501', null, 'Timestamps cannot be forged');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select is((select count(*)::integer from public.learner_module_statuses), 0, 'Another account cannot read assessments');
select throws_ok($$select * from public.set_learner_module_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'turns', 'excellent')$$,
  '42501', null, 'Another account cannot change an existing assessment');
select throws_ok($$select * from public.set_learner_module_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'parking', 'excellent')$$,
  '42501', null, 'Another account cannot create an assessment for this learner');
select * from finish();
rollback;
