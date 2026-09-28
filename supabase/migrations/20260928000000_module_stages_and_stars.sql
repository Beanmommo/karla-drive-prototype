-- Preserve existing assessments: not_performed=0, needs_practice=1, excellent=3.
-- The new developing value represents 2 stars; no existing records are rewritten.
alter table public.learner_module_statuses
  drop constraint learner_module_statuses_module_id_check,
  drop constraint learner_module_statuses_status_check,
  add constraint learner_module_statuses_module_id_check check (module_id in (
    'car_control', 'observation', 'signals', 'turns', 'intersections', 'roundabouts',
    'hill_starts', 'parking', 'three_point_turn', 'speed', 'following',
    'lane_changes', 'merging', 'hazards', 'conditions', 'independent', 'reversing', 'attention'
  )),
  add constraint learner_module_statuses_status_check
    check (status in ('not_performed', 'needs_practice', 'developing', 'excellent'));
comment on column public.learner_module_statuses.status is
  'Manual star rating: not_performed=0, needs_practice=1, developing=2, excellent=3.';

-- Extend offline review validation with the same catalogue and fourth rating.
create or replace function public.sync_practice_session(p_record jsonb, p_revision bigint, p_points jsonb, p_events jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_account uuid := auth.uid();
  v_id uuid := (p_record->>'id')::uuid;
  v_learner uuid := (p_record->>'learner_id')::uuid;
  v_existing public.practice_sessions%rowtype;
  v_start timestamptz := to_timestamp((p_record->>'started_at')::double precision / 1000);
  v_end timestamptz := to_timestamp((p_record->>'ended_at')::double precision / 1000);
  v_record jsonb := p_record;
  v_conflicts jsonb := '[]'::jsonb;
  v_item jsonb;
  v_key text;
  v_updated timestamptz;
  v_timestamp bigint;
  v_affected integer;
  v_applied jsonb := '{}'::jsonb;
begin
  if v_account is null or (p_record->>'account_id')::uuid is distinct from v_account
    or not exists (select 1 from public.learners where id = v_learner and account_id = v_account)
  then raise exception 'Learner is not owned by this account' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_id::text, 0));
  if exists (select 1 from public.practice_sessions where id = v_id and account_id <> v_account)
    or exists (select 1 from public.practice_discards where id = v_id and account_id <> v_account)
  then raise exception 'Session is not owned by this account' using errcode = '42501'; end if;
  if exists (select 1 from public.practice_discards where id = v_id) then return '{"discarded":true}'::jsonb; end if;
  if p_revision is null or p_revision < 1 or v_start is null or v_start > clock_timestamp() + interval '5 minutes'
    or coalesce(p_record->>'status','') not in ('active', 'finished')
    or ((p_record->>'status' = 'finished') is distinct from (v_end is not null))
    or (v_end is not null and v_end < v_start)
    or jsonb_typeof(p_record->'metrics') is distinct from 'object'
    or jsonb_typeof(p_record->'review') is distinct from 'object'
    or (p_record->'checks' @> '["plates","supervision","safe_driving","devices"]'::jsonb) is not true
    or p_record->>'checks_version' is distinct from 'practice-v1'
    or jsonb_typeof(p_points) is distinct from 'array' or jsonb_array_length(p_points) > 500
    or jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events) > 500
  then raise exception 'Invalid practice recording' using errcode = '23514'; end if;
  foreach v_key in array array['distanceMeters','movingSeconds','stoppedSeconds','nightSeconds','maxSpeed'] loop
    if jsonb_typeof(p_record->'metrics'->v_key) is distinct from 'number'
      or (p_record->'metrics'->>v_key)::numeric < 0
      then raise exception 'Invalid practice metric' using errcode = '23514'; end if;
  end loop;
  if (p_record->'metrics'->>'movingSeconds')::numeric + (p_record->'metrics'->>'stoppedSeconds')::numeric
      > extract(epoch from (coalesce(v_end, clock_timestamp() + interval '5 minutes') - v_start)) + 1
    or (p_record->'metrics'->>'nightSeconds')::numeric
      > (p_record->'metrics'->>'movingSeconds')::numeric + (p_record->'metrics'->>'stoppedSeconds')::numeric + 1
    then raise exception 'Invalid practice time' using errcode = '23514'; end if;
  select * into v_existing from public.practice_sessions where id = v_id for update;
  if found and (v_existing.learner_id <> v_learner or v_existing.started_at <> v_start) then
    raise exception 'Session ownership and start time cannot change' using errcode = '23514';
  end if;
  if v_existing.id is null or p_revision > v_existing.revision then
    if v_existing.status = 'finished' and p_record->>'status' = 'active' then
      raise exception 'A finished session cannot restart' using errcode = '23514';
    end if;
    -- A review is applied once. Delayed offline reviews cannot overwrite newer assessments.
    if p_record->>'reviewed_at' is not null and v_existing.record->>'reviewed_at' is null then
      if v_end is null then raise exception 'Stop before reviewing' using errcode = '23514'; end if;
      for v_key, v_item in select key, value from jsonb_each(p_record->'review') loop
        if v_key not in ('car_control','observation','signals','turns','intersections','roundabouts','hill_starts','parking',
          'three_point_turn','speed','following','lane_changes','merging','hazards','conditions','independent','reversing','attention')
          or coalesce(v_item->>'status','') not in ('not_performed','needs_practice','developing','excellent')
        then raise exception 'Invalid module assessment' using errcode = '23514'; end if;
        -- Serialize this assessment with other practice reviews; normal UPDATE also takes a row lock.
        perform pg_advisory_xact_lock(hashtextextended(v_learner::text || ':' || v_key, 0));
        v_updated := null;
        select updated_at into v_updated from public.learner_module_statuses
          where learner_id = v_learner and module_id = v_key and account_id = v_account for update;
        if v_updated is distinct from (v_item->>'expectedUpdatedAt')::timestamptz
          and not exists (select 1 from public.practice_sessions s where s.account_id=v_account and s.learner_id=v_learner
            and to_timestamp((s.record->>'reviewed_at')::double precision / 1000) = (v_item->>'expectedUpdatedAt')::timestamptz
            and (s.record->'review_applied_times'->>v_key)::timestamptz = v_updated) then
          v_conflicts := v_conflicts || jsonb_build_array(v_key);
        else
          insert into public.learner_module_statuses(account_id, learner_id, module_id, status)
          values (v_account, v_learner, v_key, v_item->>'status')
          on conflict (learner_id, module_id) do update set status = excluded.status
            where public.learner_module_statuses.updated_at is not distinct from v_updated;
          get diagnostics v_affected = row_count;
          if v_affected = 0 then v_conflicts := v_conflicts || jsonb_build_array(v_key);
          else
            select updated_at into v_updated from public.learner_module_statuses where learner_id=v_learner and module_id=v_key;
            v_applied := v_applied || jsonb_build_object(v_key, v_updated);
          end if;
        end if;
      end loop;
    elsif v_existing.record->>'reviewed_at' is not null then
      v_record := jsonb_set(jsonb_set(v_record, '{review}', v_existing.record->'review'), '{reviewed_at}', v_existing.record->'reviewed_at');
      v_conflicts := coalesce(v_existing.record->'review_conflicts', '[]'::jsonb);
      v_applied := coalesce(v_existing.record->'review_applied_times', '{}'::jsonb);
    end if;
    v_record := jsonb_set(jsonb_set(v_record, '{review_conflicts}', v_conflicts), '{review_applied_times}', v_applied);
    insert into public.practice_sessions(id,account_id,learner_id,started_at,ended_at,status,revision,record)
    values(v_id,v_account,v_learner,v_start,v_end,v_record->>'status',p_revision,v_record)
    on conflict(id) do update set ended_at=excluded.ended_at,status=excluded.status,revision=excluded.revision,
      record=excluded.record,updated_at=clock_timestamp();
  else
    v_record := v_existing.record;
    v_end := v_existing.ended_at;
    v_conflicts := coalesce(v_record->'review_conflicts', '[]'::jsonb);
  end if;
  for v_item in select value from jsonb_array_elements(p_points) loop
    v_timestamp := floor((v_item->>'timestamp')::numeric)::bigint;
    if v_timestamp is null or v_timestamp < extract(epoch from v_start) * 1000
      or (v_end is not null and v_timestamp > extract(epoch from v_end) * 1000)
      or (v_item->>'latitude')::numeric not between -90 and 90
      or (v_item->>'longitude')::numeric not between -180 and 180
      or (v_item->>'accuracy')::numeric not between 0 and 50
      or jsonb_typeof(v_item->'latitude') is distinct from 'number'
      or jsonb_typeof(v_item->'longitude') is distinct from 'number'
      or jsonb_typeof(v_item->'accuracy') is distinct from 'number'
      or v_timestamp > extract(epoch from clock_timestamp() + interval '5 minutes') * 1000
    then raise exception 'Invalid recorded point' using errcode = '23514'; end if;
    insert into public.practice_points(session_id,account_id,timestamp,point) values(v_id,v_account,v_timestamp,v_item)
      on conflict(session_id,timestamp) do nothing;
  end loop;
  for v_item in select value from jsonb_array_elements(p_events) loop
    v_timestamp := floor((v_item->>'timestamp')::numeric)::bigint;
    if v_timestamp is null or jsonb_typeof(v_item->'id') is distinct from 'string'
      or jsonb_typeof(v_item->'kind') is distinct from 'string'
      or jsonb_typeof(v_item->'confidence') is distinct from 'number'
      or v_timestamp > extract(epoch from clock_timestamp() + interval '5 minutes') * 1000
      or v_item->>'id' not like v_id::text || ':%' or v_item->>'kind' not in ('start','stop','left_turn','right_turn','roundabout','merge')
      or v_timestamp < extract(epoch from v_start) * 1000 or (v_end is not null and v_timestamp > extract(epoch from v_end) * 1000)
      or (v_item->>'confidence')::numeric not between 0 and 1
    then raise exception 'Invalid practice event' using errcode = '23514'; end if;
    insert into public.practice_events(id,session_id,account_id,timestamp,event) values(v_item->>'id',v_id,v_account,v_timestamp,v_item)
      on conflict(id) do nothing;
  end loop;
  return jsonb_build_object('discarded',false,'conflicts',v_conflicts);
end;
$$;
