import { learnerAvatarColors } from '../../theme';

export function getLearnerAvatarColor(learnerId: string) {
  // Hash the random learner UUID for a stable, evenly varied default. Using the
  // ID keeps colors consistent after reloads, offline, and when the list changes.
  let hash = 2166136261;
  for (let index = 0; index < learnerId.length; index++) {
    hash = Math.imul(hash ^ learnerId.charCodeAt(index), 16777619);
  }
  return learnerAvatarColors[(hash >>> 0) % learnerAvatarColors.length];
}
