import type { StoredSession } from './model';

export type PracticeHistoryFilter = 'all' | 'night';

export function filterPracticeHistory(sessions: StoredSession[], filter: PracticeHistoryFilter): StoredSession[] {
  return sessions.filter(({ session, deleted }) => !deleted && session.status === 'finished'
    // Include mixed day/night sessions and even night time below one displayed minute.
    && (filter === 'all' || session.metrics.nightSeconds > 0));
}
