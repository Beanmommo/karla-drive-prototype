import { supabase } from '../../lib/supabase';
import type { ModuleAssessment } from '../modules/model';
import type { PracticeEvent, PracticeSession, TrackPoint } from './model';
import { applyRemoteDiscards, cacheRemoteDetails, cacheRemoteSession, confirmDiscard, getSession, listSessions, markSynced,
  pendingDiscards, readEvents, readPoints, setSyncError } from './store';

let syncing: Promise<void> | null = null;
export function syncPractice(accountId: string): Promise<void> {
  if (syncing) return syncing;
  syncing = runSync(accountId).finally(() => { syncing = null; });
  return syncing;
}
async function runSync(accountId: string) {
  if (!supabase || accountId === 'local-demo') return;
  const auth = await supabase.auth.getSession();
  if (auth.data.session?.user.id !== accountId) return;
  await fetchDiscards(accountId);
  for (const item of await pendingDiscards(accountId)) {
    const { error } = await supabase.rpc('discard_practice_session', { p_id: item.id, p_learner_id: item.learner_id });
    if (error) throw new Error('Discard is saved on this device. Server deletion will retry when connected.');
    await confirmDiscard(item.id);
  }
  for (const row of await listSessions(accountId)) {
    // Samples/events can remain after the metadata revision has been acknowledged.
    let points = await readPoints(row.session.id, 0, 250, true);
    let events = (await readEvents(row.session.id, true)).slice(0, 250);
    if (!row.dirty && !points.length && !events.length) continue;
    try {
      for (let batch = 0; batch < 50; batch++) {
        const current = await getSession(row.session.id, accountId);
        if (!current) break; // Discard happened while a prior network request was in flight.
        const { data, error } = await supabase.rpc('sync_practice_session', {
          p_record: current.session, p_revision: current.revision, p_points: points, p_events: events,
        });
        if (error) throw new Error('Session saved on this device. Upload will retry when connected.');
        if (data?.discarded) {
          await applyRemoteDiscards([{ id: current.session.id, account_id: accountId, learner_id: current.session.learner_id }]);
          break;
        }
        await markSynced(current.session.id, current.revision, points.map(p => p.timestamp), events.map(e => e.id), data?.conflicts ?? []);
        points = await readPoints(current.session.id, 0, 250, true);
        events = (await readEvents(current.session.id, true)).slice(0, 250);
        if (!points.length && !events.length) break;
      }
    } catch (error) {
      await setSyncError(row.session.id, error instanceof Error ? error.message : 'Upload pending.');
      // Stop hammering an offline backend; all remaining work stays durable.
      return;
    }
  }
  // Catch a discard queued during an upload; the server tombstone wins over that upload.
  for (const item of await pendingDiscards(accountId)) {
    const { error } = await supabase.rpc('discard_practice_session', { p_id: item.id, p_learner_id: item.learner_id });
    if (!error) await confirmDiscard(item.id);
  }
}
async function fetchDiscards(accountId: string) {
  if (!supabase) return;
  for (let offset = 0; ; offset += 1000) {
    const result = await supabase.from('practice_discards').select('id,account_id,learner_id').eq('account_id', accountId).order('id').range(offset, offset + 999);
    if (result.error) throw new Error('History refresh pending. Saved sessions are available on this device.');
    await applyRemoteDiscards(result.data);
    if (result.data.length < 1000) break;
  }
}
export async function fetchPracticeHistory(accountId: string, learnerId: string, offset = 0): Promise<boolean> {
  if (!supabase) return false;
  await fetchDiscards(accountId);
  const { data, error } = await supabase.from('practice_sessions').select('record,revision')
    .eq('account_id', accountId).eq('learner_id', learnerId).eq('status', 'finished')
    .order('ended_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 29);
  if (error) throw new Error('Could not refresh history. Saved sessions are still available.');
  for (const row of data) {
    const record = row.record as PracticeSession;
    if (record.account_id === accountId && record.learner_id === learnerId) await cacheRemoteSession(record, row.revision);
  }
  return data.length === 30;
}
export async function fetchPracticeDetails(id: string, accountId: string): Promise<void> {
  if (!supabase) return;
  const local = await getSession(id, accountId);
  if (!local || local.dirty) return;
  const points: TrackPoint[] = [];
  const events: PracticeEvent[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await supabase.from('practice_points').select('point').eq('session_id', id).eq('account_id', accountId)
      .order('timestamp').range(offset, offset + 999);
    if (result.error) throw new Error('Could not load the full recording.');
    points.push(...result.data.map(row => row.point as TrackPoint));
    if (result.data.length < 1000) break;
  }
  for (let offset = 0; ; offset += 1000) {
    const result = await supabase.from('practice_events').select('event').eq('session_id', id).eq('account_id', accountId)
      .order('timestamp').range(offset, offset + 999);
    if (result.error) throw new Error('Could not load detected activities.');
    events.push(...result.data.map(row => row.event as PracticeEvent));
    if (result.data.length < 1000) break;
  }
  await cacheRemoteDetails(id, points, events);
}

export async function overlayPracticeReviews(accountId: string, learnerId: string, records: ModuleAssessment[]): Promise<ModuleAssessment[]> {
  const result = [...records];
  const rows = (await listSessions(accountId, learnerId)).filter(row => row.session.reviewed_at && (row.dirty || !supabase))
    .sort((a, b) => a.session.reviewed_at! - b.session.reviewed_at!);
  for (const { session } of rows) for (const [moduleId, review] of Object.entries(session.review)) {
    if (!review || session.review_conflicts.includes(moduleId)) continue;
    const index = result.findIndex(row => row.module_id === moduleId);
    const current = result[index];
    if ((current?.updated_at ?? null) !== review.expectedUpdatedAt) continue;
    const next = { account_id: accountId, learner_id: learnerId, module_id: moduleId as ModuleAssessment['module_id'],
      status: review.status, updated_at: new Date(session.reviewed_at!).toISOString() };
    if (index < 0) result.push(next); else result[index] = next;
  }
  return result;
}
