-- Keep earlier confirmations intact; new profiles only confirm permit possession.
alter table public.learners
  drop constraint learners_acknowledgements_check,
  drop constraint learners_requirements_version_check;

alter table public.learners
  add constraint learners_requirements_version_check
    check (requirements_version in ('vic-car-2026-09-23', 'vic-learner-2026-09-23-v2')),
  add constraint learners_acknowledgements_check check (
    jsonb_typeof(acknowledgements) = 'object' and (
      (requirements_version = 'vic-car-2026-09-23' and
        acknowledgements @> '{"permit":true,"plates":true,"supervision":true,"safe_driving":true,"devices":true}'::jsonb)
      or
      (requirements_version = 'vic-learner-2026-09-23-v2' and
        acknowledgements = '{"permit":true}'::jsonb)
    )
  );
