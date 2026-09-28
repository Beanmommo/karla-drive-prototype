import type { StoredSession } from './model';
import { getPracticeBadges, practiceBadges, type PracticeBadgeId } from './badges.ts';

export type PracticeHistoryFilter = PracticeBadgeId | null;

export function resolvePracticeHistoryFilter(badge: string | undefined, legacyFilter?: string): PracticeHistoryFilter {
  // Keep previously shared Night hours links working. An empty badge explicitly clears them.
  if (badge === undefined && legacyFilter === 'night') return 'night_drive';
  return practiceBadges.find(item => item.id === badge)?.id ?? null;
}

export function filterPracticeHistory(sessions: StoredSession[], filter: PracticeHistoryFilter): StoredSession[] {
  return sessions.filter(({ session, deleted }) => !deleted && session.status === 'finished'
    // Include mixed day/night sessions and even night time below one displayed minute.
    && (filter === null || getPracticeBadges(session).some(badge => badge.id === filter)));
}
