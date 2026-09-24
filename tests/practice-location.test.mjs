import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { distance } from '../src/features/practice/model.ts';

// Run the real recording lifecycle and SQLite store. Only native bridges and
// network/account services are replaced; no real coordinates or permissions.
const connection = new DatabaseSync(':memory:');
const sqlite = {
  execAsync: async sql => connection.exec(sql),
  runAsync: async (sql, ...values) => connection.prepare(sql).run(...values),
  getFirstAsync: async (sql, ...values) => connection.prepare(sql).get(...values) ?? null,
  getAllAsync: async (sql, ...values) => connection.prepare(sql).all(...values),
  withExclusiveTransactionAsync: async fn => {
    connection.exec('BEGIN IMMEDIATE');
    try { await fn(sqlite); connection.exec('COMMIT'); }
    catch (error) { connection.exec('ROLLBACK'); throw error; }
  },
};
const epoch = Date.parse('2026-09-24T02:00:00Z');
const origin = { latitude: -37.8136, longitude: 144.9631 };
let now = epoch, id = 0, callback, running = false, options, registrations = 0;
let lastDelivered, pending = [];
const location = (timestamp = now, accuracy = 8) => ({ timestamp,
  coords: { ...origin, accuracy, speed: 0, heading: 0, altitude: 0 } });
const mocks = {
  'expo-sqlite': { openDatabaseAsync: async () => sqlite },
  'expo-crypto': { randomUUID: () => `location-test-${++id}` },
  'expo-location': {
    Accuracy: { Highest: 5, BestForNavigation: 6 }, ActivityType: { AutomotiveNavigation: 1 },
    getCurrentPositionAsync: async () => location(),
    startLocationUpdatesAsync: async (_name, next) => { running = true; options = next; registrations++; },
    hasStartedLocationUpdatesAsync: async () => running,
    stopLocationUpdatesAsync: async () => { running = false; },
  },
  'expo-task-manager': { isTaskDefined: () => false, defineTask: (_name, task) => { callback = task; },
    getTaskOptionsAsync: async () => options },
  'expo-notifications': { setNotificationHandler: () => {}, scheduleNotificationAsync: async () => {} },
  'react-native': { Platform: { OS: 'ios' } },
  '../../lib/supabase': { getDemoAccountId: async () => 'owner' },
  './config': { mapboxToken: () => '' },
  './permissions': { hasPracticeAccess: async () => true },
  './sync': { syncPractice: async () => {} },
};
globalThis.__karlaLocationTest = mocks;
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (mocks[specifier]) {
    const source = Object.keys(mocks[specifier]).map(key =>
      `export const ${key}=globalThis.__karlaLocationTest[${JSON.stringify(specifier)}][${JSON.stringify(key)}];`).join('\n');
    return { url: 'data:text/javascript,' + encodeURIComponent(source), shortCircuit: true };
  }
  if (specifier.startsWith('./') && context.parentURL?.includes('/features/practice/') && !specifier.endsWith('.ts')) {
    return next(specifier + '.ts', context);
  }
  return next(specifier, context);
} });
const runtime = await import('../src/features/practice/runtime.ts');
const store = await import('../src/features/practice/store.ts');
hooks.deregister();

async function start(t) {
  await store.getActiveSession(); // Initialise the real schema before clearing test rows.
  connection.exec('DELETE FROM sessions');
  now = epoch; lastDelivered = undefined; pending = []; registrations = 0; running = false;
  t.mock.method(Date, 'now', () => now);
  return runtime.startPractice({ id: 'learner', account_id: 'owner', name: 'Test' },
    { mode: 'destination', origin, stops: [], geometry: [], requestedMinutes: 0, estimatedSeconds: 0, distanceMeters: 0 },
    ['plates', 'supervision', 'safe_driving', 'devices']);
}

// Model the SDK 57 iOS consumer's movement filter and background deferral.
// iOS does not implement the Android-only timeInterval option.
async function deliver(seconds, { background = false, accuracy = 8 } = {}) {
  now = epoch + seconds * 1000;
  if (!running) return;
  const sample = location(now, accuracy);
  const previous = pending.at(-1) ?? lastDelivered;
  if (previous && (options.distanceInterval ?? -1) > distance(previous.coords, sample.coords)) return;
  pending.push(sample);
  const oldest = lastDelivered ?? pending[0];
  if (background && sample.timestamp - oldest.timestamp < (options.deferredUpdatesInterval ?? 0)) return;
  const locations = pending; pending = []; lastDelivered = sample;
  await callback({ data: { locations } });
}

test('a stationary iPhone continues recording stopped time beyond the GPS freshness window', async t => {
  const session = await start(t);
  for (let seconds = 0; seconds <= 120; seconds += 5) await deliver(seconds);
  const { session: saved } = await store.getSession(session.id);
  assert.equal(saved.metrics.lastPoint.timestamp, now);
  assert.equal(saved.metrics.stoppedSeconds, 120);
  assert.equal(saved.metrics.movingSeconds, 0);
  assert.equal(saved.metrics.distanceMeters, 0);
  assert.equal((await store.readPoints(session.id)).length, 25);
  assert.equal((await store.readEvents(session.id)).length, 0);
  await runtime.stopPractice(session.id);
});

test('the first background GPS reading is delivered without waiting for another reading', async t => {
  const session = await start(t);
  await deliver(1, { background: true });
  assert.equal((await store.getSession(session.id)).session.metrics.lastPoint?.timestamp, now);
  for (let seconds = 6; seconds <= 61; seconds += 5) await deliver(seconds, { background: true });
  assert.equal((await store.getSession(session.id)).session.metrics.stoppedSeconds, 60);
  await runtime.stopPractice(session.id);
});

test('resuming uses stationary updates and bad fixes or late callbacks cannot add practice time', async t => {
  const session = await start(t);
  running = false;
  await runtime.resumePractice(session.id);
  await deliver(0); await deliver(5); await deliver(10);
  assert.equal(registrations, 2);
  const before = (await store.getSession(session.id)).session;
  assert.equal(before.metrics.stoppedSeconds, 10);
  await deliver(35, { accuracy: 100 });
  const stale = (await store.getSession(session.id)).session;
  assert.deepEqual(stale.metrics, before.metrics);
  assert.ok(now - stale.metrics.lastPoint.timestamp > 20000);
  await runtime.stopPractice(session.id);
  await callback({ data: { locations: [location(now + 1000)] } });
  assert.deepEqual((await store.getSession(session.id)).session.metrics, before.metrics);
});

test('recovery upgrades a persisted movement-filtered task once without creating a new session', async t => {
  const session = await start(t);
  options = { ...options, distanceInterval: 3, timeInterval: 5000, deferredUpdatesInterval: 5000 };
  await runtime.recoverPractice();
  await runtime.recoverPractice();
  assert.equal(registrations, 2);
  assert.equal((await store.getActiveSession()).session.id, session.id);
  await deliver(0); await deliver(5); await deliver(10);
  assert.equal((await store.getSession(session.id)).session.metrics.stoppedSeconds, 10);
  await runtime.stopPractice(session.id);
});
