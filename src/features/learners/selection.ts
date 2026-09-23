import type { Learner } from './model';

export function resolveSelectedLearnerId(learners: Learner[], preferredId: string | null): string | null {
  return learners.find((learner) => learner.id === preferredId)?.id ?? learners[0]?.id ?? null;
}
