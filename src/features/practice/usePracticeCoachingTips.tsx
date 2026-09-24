import type { Learner } from '../learners/model';
import { getModuleCoachingTip } from '../modules/model';
import { useLearnerModules } from '../modules/ModuleStatusesProvider';
import { ModuleTipsCarousel } from './ModuleTipsCarousel';

export function usePracticeCoachingTips(learner: Learner | undefined) {
  const assessments = useLearnerModules(learner);
  const modules = assessments.modules.filter(module =>
    (module.status === 'needs_practice' || module.status === 'not_performed') && getModuleCoachingTip(module));

  // Empty, loading, and unavailable tips stay hidden during practice. Placeholders
  // belong on module details and must not count as coaching content here.
  if (!learner || !assessments.loaded || !modules.length) return null;

  // Reset when the recorded learner or eligible list changes. Cached statuses
  // can still supply tips while a server refresh is unavailable.
  return <ModuleTipsCarousel key={`${learner.id}:${modules.map(module => `${module.id}:${module.status}`).join(',')}`} modules={modules} />;
}
