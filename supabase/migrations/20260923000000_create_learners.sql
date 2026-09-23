create table public.learners (
  id uuid primary key,
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  date_of_birth date not null check (date_of_birth <= (timezone('Australia/Melbourne', now())::date - interval '16 years')::date),
  country text not null check (country = 'AU'),
  state text not null check (state = 'VIC'),
  acknowledgements jsonb not null check (
    acknowledgements @> '{"permit": true, "plates": true, "supervision": true, "safe_driving": true, "devices": true}'::jsonb
  ),
  requirements_version text not null check (requirements_version = 'vic-car-2026-09-23'),
  agreement_version text not null check (agreement_version = 'demo-v1'),
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index learners_account_created_idx on public.learners(account_id, created_at desc);
alter table public.learners enable row level security;
revoke all on public.learners from anon, authenticated;
grant select on public.learners to authenticated;
grant insert (id, account_id, name, date_of_birth, country, state, acknowledgements, requirements_version, agreement_version)
  on public.learners to authenticated;

create policy "Supervisors read their learners" on public.learners
  for select to authenticated using ((select auth.uid()) = account_id);
create policy "Supervisors create their learners" on public.learners
  for insert to authenticated with check ((select auth.uid()) = account_id);

comment on table public.learners is 'Supervisor-owned learner profiles. Anonymous Auth identities are for the local demo only.';
