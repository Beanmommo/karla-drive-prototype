import { randomUUID } from 'expo-crypto';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { getDemoAccountId } from '../../lib/supabase';

import type { Learner } from '../learners/model';
import { mapboxToken } from './config';
import { distance, emptyMetrics, type PracticeEvent, type PracticeRoute, type PracticeSession, type TrackPoint } from './model';
import { hasPracticeAccess } from './permissions';
import { matchRecordedPoints } from './routing';
import { appendLocations, appendMatchedEvents, changeSession, createSession, discardSession, getActiveSession, getSession, readPoints } from './store';
import { syncPractice } from './sync';

export const LOCATION_TASK = 'karla-practice-location-v1';
let analyzing: Promise<void> | null = null;
let lastAnalysis = 0;
let lastSync = 0;
let startPromise: Promise<PracticeSession> | null = null;
let stopPromise: Promise<PracticeSession | null> | null = null;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({ handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
  }) });
}
async function notify(id: string, body: string, sessionId: string) {
  await Notifications.scheduleNotificationAsync({ identifier: id,
    content: { title: 'Karla Drive', body, data: { sessionId }, sound: false }, trigger: null });
}
async function notifyEvents(events: PracticeEvent[], sessionId: string) {
  for (const event of events) {
    if (Date.now() - event.timestamp > 60000) continue; // Recovered historical events don't generate stale banners.
    await notify(event.id, event.description + '.', sessionId).catch(() => {});
  }
}
function point(location: Location.LocationObject): TrackPoint {
  return { ...location.coords, timestamp: Math.floor(location.timestamp) };
}
export async function freshLocation(): Promise<TrackPoint> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('GPS is taking too long. Move to an open area and try again.')), 20000); }),
    ]);
    if (location.coords.accuracy === null || location.coords.accuracy > 50 || Date.now() - location.timestamp > 15000) {
      throw new Error('Waiting for an accurate GPS fix. Try again in an open area.');
    }
    return point(location);
  } finally { clearTimeout(timer); }
}
export function analyzeRecording(sessionId: string): Promise<void> {
  if (analyzing) return analyzing;
  analyzing = (async () => {
    if (!mapboxToken()) return;
    const record = await getSession(sessionId);
    if (!record) return;
    // Overlap catches maneuvers spanning batches. Dedupe prevents double counting.
    const samples = await readPoints(sessionId, Math.max(0, record.session.matched_until - 20000), 100);
    if (!samples.length || samples[samples.length - 1].timestamp <= record.session.matched_until) return;
    if (samples.length < 4) {
      if (record.session.status === 'finished') await appendMatchedEvents(sessionId, [], samples[samples.length - 1].timestamp);
      return;
    }
    try {
      const events = await matchRecordedPoints(sessionId, samples, mapboxToken());
      const last = record.session.status === 'finished' && samples.length < 100 ? samples.length - 1 : samples.length - 3;
      const added = await appendMatchedEvents(sessionId, events, samples[Math.max(0, last)].timestamp);
      const current = await getSession(sessionId);
      if (current?.session.status === 'active') await notifyEvents(added, sessionId);
    } catch {
      await changeSession(sessionId, session => ({ ...session, detection_error: 'Road detection pending. GPS recording is saved; matching will retry.' }));
    }
  })().finally(() => { analyzing = null; });
  return analyzing;
}
async function ingest(locations: Location.LocationObject[]) {
  const result = await appendLocations(locations.map(point).filter(p => p.timestamp <= Date.now() + 1000));
  if (!result) return;
  await notifyEvents(result.events, result.session.id);
  const now = Date.now();
  if (now - lastAnalysis >= 45000) {
    lastAnalysis = now;
    await analyzeRecording(result.session.id);
  }
  if (now - lastSync >= 60000) {
    lastSync = now;
    await syncPractice(result.session.account_id).catch(() => {});
  }
}
if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(LOCATION_TASK)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      const active = await getActiveSession();
      if (active) await changeSession(active.session.id, session => ({ ...session, tracking_error: 'GPS tracking was interrupted. Return to Practice to check recording.' }));
      return;
    }
    if (!data?.locations) return;
    // SQLite serializes short writes; networking must never block the next batch's durable write.
    await ingest(data.locations);
  });
}
const options: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.BestForNavigation, activityType: Location.ActivityType.AutomotiveNavigation,
  // SDK 57's iOS task consumer defaults an omitted distanceInterval to
  // kCLDistanceFilterNone. A movement filter starves stationary recordings;
  // timeInterval is Android-only and cannot provide an iOS heartbeat.
  ...(Platform.OS === 'android' ? { distanceInterval: 3, timeInterval: 5000 } : {}),
  // Deliver the first background fix immediately, even if no second fix arrives.
  deferredUpdatesInterval: 0,
  pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true,
  foregroundService: { notificationTitle: 'Karla Drive is recording', notificationBody: 'Your practice session is in progress.', killServiceOnDestroy: false },
};
export function startPractice(learner: Learner, route: PracticeRoute, checks: string[]): Promise<PracticeSession> {
  if (startPromise) return startPromise;
  startPromise = (async () => {
    if (await getDemoAccountId() !== learner.account_id) throw new Error('Your account changed. Return to Home and select a learner.');
    if (!await hasPracticeAccess()) throw new Error('GPS, background tracking, and notifications must all be enabled.');
    if (await getActiveSession()) throw new Error('A practice session is already recording.');
    if (!['plates', 'supervision', 'safe_driving', 'devices'].every(key => checks.includes(key))) throw new Error('Complete every pre-drive check.');
    const fix = await freshLocation();
    if (route.mode === 'generated' && distance(fix, route.origin) > 200) throw new Error('Your starting location changed. Generate a new route before starting.');
    const session: PracticeSession = {
      id: randomUUID(), account_id: learner.account_id, learner_id: learner.id, learner_name: learner.name,
      started_at: Date.now(), ended_at: null, status: 'active', route: route.mode === 'destination' ? { ...route, origin: fix } : route,
      checks, checks_version: 'practice-v1', metrics: emptyMetrics(), interrupted: false, tracking_error: null,
      matched_until: 0, detection_error: null, review: {}, reviewed_at: null, review_conflicts: [],
    };
    await createSession(session);
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, options);
    } catch {
      await changeSession(session.id, s => ({ ...s, status: 'finished', ended_at: Date.now() }));
      await discardSession(session.id, learner.account_id);
      throw new Error('Background recording could not start. Check permissions and install the current development build.');
    }
    await notify(session.id + ':started', 'Your practice session has started.', session.id).catch(() => {});
    return session;
  })().finally(() => { startPromise = null; });
  return startPromise;
}
export function stopPractice(sessionId: string): Promise<PracticeSession | null> {
  if (stopPromise) return stopPromise;
  const endedAt = Date.now();
  stopPromise = (async () => {
    // Seal the recording before awaiting native teardown or networking. Late callbacks are ignored.
    const session = await changeSession(sessionId, current => current.status === 'active'
      ? { ...current, status: 'finished', ended_at: Math.max(endedAt, current.metrics.lastPoint?.timestamp ?? endedAt) } : current);
    try {
      if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    } catch {
      await changeSession(sessionId, current => ({ ...current, tracking_error: 'Recording is saved. Location service shutdown needs a retry.' }));
      throw new Error('Session saved, but the location service could not stop. Tap Stop again.');
    }
    return session;
  })().finally(() => { stopPromise = null; });
  return stopPromise;
}
export async function recoverPractice(): Promise<PracticeSession | null> {
  if (Platform.OS === 'web') return null;
  const active = await getActiveSession();
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (!active) {
    if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    return null;
  }
  if (!running) {
    return changeSession(active.session.id, session => ({ ...session, interrupted: true,
      tracking_error: 'Recording was interrupted. Resume tracking or stop to keep what was recorded.' }));
  }
  if (Platform.OS === 'ios') {
    // Task options survive app upgrades. Update old recordings in place without
    // restarting a correctly configured task on every foreground maintenance pass.
    const registered = await TaskManager.getTaskOptionsAsync<Location.LocationTaskOptions | null>(LOCATION_TASK);
    if ((registered?.distanceInterval ?? 0) > 0 || (registered?.deferredUpdatesInterval ?? 0) > 0) {
      const current = await getActiveSession();
      if (!stopPromise && current?.session.id === active.session.id) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK, options);
      }
    }
  }
  return active.session;
}
export async function resumePractice(id: string) {
  if (!await hasPracticeAccess()) throw new Error('Restore GPS, background location, and notification access in Settings.');
  const current = await getSession(id);
  if (!current || current.session.status !== 'active') return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, options);
  await changeSession(id, session => ({ ...session, tracking_error: null, interrupted: true }));
}
