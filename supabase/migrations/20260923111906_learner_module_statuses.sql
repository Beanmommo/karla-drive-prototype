alter table public.learners add constraint learners_id_account_unique unique (id, account_id);

create table public.learner_module_statuses (
  account_id uuid not null default auth.uid(),
  learner_id uuid not null,
  module_id text not null check (module_id in (
    'car_control', 'observation', 'signals', 'turns', 'intersections', 'roundabouts',
    'hill_starts', 'parking', 'three_point_turn', 'speed', 'following',
    'lane_changes', 'merging', 'hazards', 'conditions', 'independent'
  )),
  status text not null check (status in ('not_performed', 'needs_practice', 'excellent')),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (learner_id, module_id),
  foreign key (learner_id, account_id) references public.learners (id, account_id) on delete cascade
);
create index learner_module_statuses_account_idx on public.learner_module_statuses (account_id);
comment on table public.learner_module_statuses is 'Current manual assessment; does not record a practice session or GPS evidence.';

alter table public.learner_module_statuses enable row level security;
revoke all on public.learner_module_statuses from anon, authenticated;
grant select on public.learner_module_statuses to authenticated;
grant insert (account_id, learner_id, module_id, status) on public.learner_module_statuses to authenticated;
grant update (status) on public.learner_module_statuses to authenticated;

create policy module_status_read on public.learner_module_statuses for select to authenticated
  using (account_id = (select auth.uid()));
create policy module_status_insert on public.learner_module_statuses for insert to authenticated
  with check (account_id = (select auth.uid()) and exists (
    select 1 from public.learners where id = learner_id and account_id = (select auth.uid())
  ));
create policy module_status_update on public.learner_module_statuses for update to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));

create function public.stamp_module_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := case when new.status is distinct from old.status then clock_timestamp() else old.updated_at end;
  return new;
end;
$$;
revoke all on function public.stamp_module_status() from public, anon, authenticated;
create trigger stamp_module_status before update on public.learner_module_statuses
  for each row execute function public.stamp_module_status();

-- The invoker keeps RLS active; callers can update status, never ownership or timestamps.
create function public.set_learner_module_status(p_learner_id uuid, p_module_id text, p_status text)
returns setof public.learner_module_statuses language sql security invoker set search_path = '' as $$
  insert into public.learner_module_statuses (account_id, learner_id, module_id, status)
  values (auth.uid(), p_learner_id, p_module_id, p_status)
  on conflict (learner_id, module_id) do update set status = excluded.status
  returning *;
$$;
revoke all on function public.set_learner_module_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_learner_module_status(uuid, text, text) to authenticated;
