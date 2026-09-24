begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;
select no_plan();
insert into auth.users (id,aud,role) values
 ('11111111-1111-4111-8111-111111111111','authenticated','authenticated'),
 ('22222222-2222-4222-8222-222222222222','authenticated','authenticated');
insert into public.learners (id,account_id,name,date_of_birth,country,state,acknowledgements,requirements_version,agreement_version)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Practice test','2000-04-16','AU','VIC','{"permit":true}','vic-learner-2026-09-23-v2','demo-v1');
create function pg_temp.record(p_id text, p_status text default 'finished', p_review jsonb default '{}', p_reviewed bigint default null)
returns jsonb language sql as $$ select jsonb_build_object(
 'id',p_id,'account_id','11111111-1111-4111-8111-111111111111','learner_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'learner_name','Practice test','started_at',extract(epoch from now()-interval '10 minutes')*1000,
 'ended_at',case when p_status='finished' then extract(epoch from now()-interval '1 minute')*1000 else null end,
 'status',p_status,'checks',jsonb_build_array('plates','supervision','safe_driving','devices'),'checks_version','practice-v1',
 'metrics',jsonb_build_object('movingSeconds',60,'stoppedSeconds',30,'nightSeconds',10,'distanceMeters',300,'maxSpeed',8),
 'review',p_review,'reviewed_at',p_reviewed,'review_conflicts','[]'::jsonb); $$;
create function pg_temp.points() returns jsonb language sql as $$ select jsonb_build_array(jsonb_build_object(
 'timestamp',floor(extract(epoch from now()-interval '5 minutes')*1000)+0.3608,'latitude',-37.81,'longitude',144.96,'accuracy',5)); $$;
select ok(not has_table_privilege('authenticated','public.practice_sessions','INSERT'),'Direct recording writes are disabled');
select ok(not has_function_privilege('anon','public.sync_practice_session(jsonb,bigint,jsonb,jsonb)','EXECUTE'),'Anonymous role cannot upload');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select lives_ok($$select sync_practice_session(pg_temp.record('cccccccc-cccc-4ccc-8ccc-cccccccccccc','active'),1,pg_temp.points(),'[]')$$,'Owner uploads an active recording');
select lives_ok($$select sync_practice_session(pg_temp.record('cccccccc-cccc-4ccc-8ccc-cccccccccccc','active'),1,pg_temp.points(),'[]')$$,'Upload retry is idempotent');
select is((select count(*)::int from practice_points),1,'Repeated samples are not duplicated');
select lives_ok($$select sync_practice_session(pg_temp.record('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),2,'[]','[]')$$,'Owner finishes the recording');
select throws_ok($$select sync_practice_session(pg_temp.record('cccccccc-cccc-4ccc-8ccc-cccccccccccc','active'),3,'[]','[]')$$,'23514',null,'Finished sessions cannot restart');
select is((select sessions_count::int from practice_totals('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')),1,'Totals include finished sessions');
select is((select recorded_seconds from practice_totals('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')),90::numeric,'Totals use observed moving plus stopped time');
select lives_ok($$select sync_practice_session(pg_temp.record('cccccccc-cccc-4ccc-8ccc-cccccccccccc','finished','{"turns":{"status":"excellent","expectedUpdatedAt":null}}',floor(extract(epoch from now()-interval '30 seconds')*1000)::bigint),3,'[]','[]')$$,'Supervisor review updates a module');
select is((select status from learner_module_statuses where module_id='turns'),'excellent','Reviewed status saved');
select throws_ok($$select discard_practice_session('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,'23514',null,'A saved review cannot accidentally be discarded');
select is(sync_practice_session(pg_temp.record('dddddddd-dddd-4ddd-8ddd-dddddddddddd','finished','{"turns":{"status":"needs_practice","expectedUpdatedAt":null}}',floor(extract(epoch from now())*1000)::bigint),1,'[]','[]')->'conflicts','["turns"]'::jsonb,'Stale reviews report conflict');
select is((select status from learner_module_statuses where module_id='turns'),'excellent','Stale review preserves the newer module status');
select lives_ok($$select sync_practice_session(pg_temp.record('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','finished',jsonb_build_object('turns',jsonb_build_object('status','needs_practice','expectedUpdatedAt',to_timestamp(floor(extract(epoch from now()-interval '30 seconds')*1000)/1000))),floor(extract(epoch from now())*1000)::bigint),1,'[]','[]')$$,'Chained offline review resolves its prior review timestamp');
select is((select status from learner_module_statuses where module_id='turns'),'needs_practice','Chained review applied once');
select lives_ok($$select sync_practice_session(pg_temp.record('ffffffff-ffff-4fff-8fff-ffffffffffff'),1,pg_temp.points(),'[]')$$,'Unreviewed session saved before discard');
select lives_ok($$select discard_practice_session('ffffffff-ffff-4fff-8fff-ffffffffffff','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,'Owner can discard');
select is((select count(*)::int from practice_points where session_id='ffffffff-ffff-4fff-8fff-ffffffffffff'),0,'Discard removes raw GPS');
select is(sync_practice_session(pg_temp.record('ffffffff-ffff-4fff-8fff-ffffffffffff'),99,pg_temp.points(),'[]')->>'discarded','true','A delayed upload cannot resurrect a discard');
select is((select sessions_count::int from practice_totals('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')),3,'Discard is excluded from totals');
select throws_ok($$select sync_practice_session(pg_temp.record('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),1,'[]','[{"id":"bad","kind":"turn"}]')$$,'23514',null,'Malformed detected activities are rejected');
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select is((select count(*)::int from practice_sessions),0,'Other supervisors cannot read sessions');
select is((select count(*)::int from practice_points),0,'Other supervisors cannot read GPS traces');
select throws_ok($$select sync_practice_session(pg_temp.record('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),100,'[]','[]')$$,'42501',null,'Other supervisors cannot overwrite sessions');
select throws_ok($$select discard_practice_session('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,'42501',null,'Other supervisors cannot discard sessions');
select * from finish();
rollback;
