import type { PracticeSession } from './model';

// Badges are derived from saved metrics, so older sessions qualify without a backfill.
export const practiceBadges = [{
  id: 'night_drive', label: 'Night drive', icon: 'moon',
  color: '#675294', backgroundColor: '#EEE8F8',
  matches: (session: PracticeSession) => session.metrics.nightSeconds > 0,
}] as const;

export type PracticeBadgeId = (typeof practiceBadges)[number]['id'];

export function getPracticeBadges(session: PracticeSession) {
  return practiceBadges.filter(badge => badge.matches(session));
}
