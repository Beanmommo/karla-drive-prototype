import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PracticeEvent, PracticeSession, StoredSession, TrackPoint } from './model';

// Web can read/review history. Continuous background recording is a native feature.
type Data = { sessions: Record<string, StoredSession>; points: Record<string, TrackPoint[]>;
  events: Record<string, PracticeEvent[]>; discarded: Record<string, { id: string; account_id: string; learner_id: string; synced: boolean }> };
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();
export const subscribePractice = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function changed() { for (const listener of listeners) listener(); }
async function read(): Promise<Data> {
  const raw = await AsyncStorage.getItem('karla:practice-web:v1');
  return raw ? JSON.parse(raw) : { sessions: {}, points: {}, events: {}, discarded: {} };
}
async function write<T>(fn: (data: Data) => T): Promise<T> {
  const result = queue.then(async () => {
    const data = await read(); const value = fn(data);
    await AsyncStorage.setItem('karla:practice-web:v1', JSON.stringify(data)); changed(); return value;
  });
  queue = result.catch(() => {}); return result;
}
export async function getSession(id: string, accountId?: string) {
  const record = (await read()).sessions[id];
  return record && (!accountId || record.session.account_id === accountId) ? record : null;
}
export async function getActiveSession(): Promise<StoredSession | null> { return null; }
export async function listSessions(accountId: string, learnerId?: string) {
  return Object.values((await read()).sessions).filter(r => r.session.account_id === accountId && (!learnerId || r.session.learner_id === learnerId))
    .sort((a, b) => (b.session.ended_at ?? 0) - (a.session.ended_at ?? 0));
}
export async function createSession(_session: PracticeSession): Promise<void> { throw new Error('Use the iPhone app to record practice.'); }
export async function changeSession(id: string, transform: (session: PracticeSession) => PracticeSession) {
  return write(data => { const row = data.sessions[id]; if (!row) return null;
    row.session = transform(row.session); row.revision++; row.dirty = true; return row.session; });
}
export async function appendLocations(_input: TrackPoint[]): Promise<{ session: PracticeSession; events: PracticeEvent[] } | null> { return null; }
export async function readPoints(id: string, after = 0, limit = 100000, unsynced = false): Promise<TrackPoint[]> {
  return unsynced ? [] : ((await read()).points[id] ?? []).filter(p => p.timestamp > after).slice(0, limit);
}
export async function readEvents(id: string, unsynced = false): Promise<PracticeEvent[]> { return unsynced ? [] : (await read()).events[id] ?? []; }
export async function appendMatchedEvents(_id: string, _events: PracticeEvent[], _until: number): Promise<PracticeEvent[]> { return []; }
export async function discardSession(id: string, accountId: string) {
  await write(data => { const row = data.sessions[id]; if (!row || row.session.account_id !== accountId) return;
    if (row.session.reviewed_at) throw new Error('This review has already been saved.');
    data.discarded[id] = { id, account_id: accountId, learner_id: row.session.learner_id, synced: false };
    delete data.sessions[id]; delete data.points[id]; delete data.events[id];
  });
}
export async function pendingDiscards(accountId: string) { return Object.values((await read()).discarded).filter(d => d.account_id === accountId && !d.synced); }
export async function confirmDiscard(id: string) { await write(data => { if (data.discarded[id]) data.discarded[id].synced = true; }); }
export async function applyRemoteDiscards(items: { id: string; account_id: string; learner_id: string }[]) {
  if (!items.length) return;
  await write(data => { for (const item of items) {
    data.discarded[item.id] = { ...item, synced: true };
    delete data.sessions[item.id]; delete data.points[item.id]; delete data.events[item.id];
  } });
}
export async function markSynced(id: string, revision: number, _timestamps: number[], _events: string[], conflicts: string[]) {
  await write(data => { const row = data.sessions[id]; if (row) { if (row.revision === revision) row.dirty = false;
    row.syncError = null; row.session.review_conflicts = conflicts; } });
}
export async function setSyncError(id: string, message: string) { await write(data => { if (data.sessions[id]) data.sessions[id].syncError = message; }); }
export async function cacheRemoteSession(session: PracticeSession, revision: number) {
  await write(data => {
    if (session.status === 'active' || data.discarded[session.id] || data.sessions[session.id]?.dirty
      || (data.sessions[session.id]?.revision ?? 0) > revision) return;
    data.sessions[session.id] = { session, revision, dirty: false, deleted: false, syncError: null };
  });
}
export async function cacheRemoteDetails(id: string, points: TrackPoint[], events: PracticeEvent[]) {
  await write(data => { if (!data.sessions[id]) return; data.points[id] = points; data.events[id] = events; });
}
