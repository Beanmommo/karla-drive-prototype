import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { emptyMetrics } from '../src/features/practice/model.ts';

// Exercise the production store against SQLite, replacing only Expo's native bridge.
const connection = new DatabaseSync(':memory:');
const bridge = {
  execAsync: async sql => connection.exec(sql),
  runAsync: async (sql, ...values) => connection.prepare(sql).run(...values),
  getFirstAsync: async (sql, ...values) => connection.prepare(sql).get(...values) ?? null,
  getAllAsync: async (sql, ...values) => connection.prepare(sql).all(...values),
  withExclusiveTransactionAsync: async fn => {
    connection.exec('BEGIN IMMEDIATE');
    try { await fn(bridge); connection.exec('COMMIT'); }
    catch (error) { connection.exec('ROLLBACK'); throw error; }
  },
};
globalThis.__karlaTestSqlite = bridge;
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'expo-sqlite') return { url: 'data:text/javascript,export async function openDatabaseAsync(){return globalThis.__karlaTestSqlite}', shortCircuit: true };
  if (specifier === './model' && context.parentURL.endsWith('/practice/store.ts')) return next('./model.ts', context);
  return next(specifier, context);
} });
const store = await import('../src/features/practice/store.ts');
hooks.deregister();
const start = Date.parse('2026-09-24T02:00:00Z');
const point = seconds => ({ latitude: -37.8136, longitude: 144.9631 + seconds * 0.00005, timestamp: start + seconds * 1000, accuracy: 5, speed: 5, heading: 90, altitude: 10 });
const session = id => ({ id, account_id: 'owner', learner_id: 'learner', learner_name: 'Test', started_at: start, ended_at: null,
  status: 'active', metrics: emptyMetrics(), review: {}, reviewed_at: null, review_conflicts: [], matched_until: 0 });

test('durable recording, retry acknowledgements, event dedupe, discard tombstones and owner scoping', async () => {
  await store.createSession(session('first'));
  await assert.rejects(store.createSession(session('second')), /already recording/);
  await Promise.all([store.appendLocations([point(0), point(5)]), store.appendLocations([point(10), point(15)])]);
  let row = await store.getSession('first', 'owner');
  assert.equal(row.session.metrics.movingSeconds, 15);
  assert.equal(await store.getSession('first', 'stranger'), null);
  assert.equal((await store.readPoints('first')).length, 4);
  const oldRevision = row.revision;
  await store.appendLocations([point(20)]);
  await store.markSynced('first', oldRevision, [point(0).timestamp], [], []);
  row = await store.getSession('first');
  assert.equal(row.dirty, true, 'acknowledging an old revision cannot mark new samples synced');
  assert.equal((await store.readPoints('first', 0, 100, true)).length, 4);
  const event = { ...point(10), id: 'first:right_turn:1', kind: 'right_turn', confidence: 0.95, source: 'mapbox' };
  assert.equal((await store.appendMatchedEvents('first', [event], point(10).timestamp)).length, 1);
  assert.equal((await store.appendMatchedEvents('first', [{ ...event, id: 'first:right_turn:2', timestamp: point(15).timestamp }], point(15).timestamp)).length, 0);
  await assert.rejects(store.discardSession('first', 'owner'), /Stop recording/);
  await store.changeSession('first', s => ({ ...s, status: 'finished', ended_at: start + 20000 }));
  assert.equal(await store.getActiveSession(), null);
  assert.equal(await store.appendLocations([point(25)]), null);
  const final = await store.getSession('first');
  await store.discardSession('first', 'owner');
  assert.equal(await store.getSession('first'), null);
  assert.equal((await store.readPoints('first')).length, 0);
  assert.equal((await store.readEvents('first')).length, 0);
  assert.equal((await store.pendingDiscards('owner')).length, 1);
  await store.cacheRemoteSession(final.session, 100);
  assert.equal(await store.getSession('first'), null, 'stale history cannot resurrect a discard');
  await store.confirmDiscard('first');
  assert.equal((await store.pendingDiscards('owner')).length, 0);
  await store.cacheRemoteSession(final.session, 101);
  assert.equal(await store.getSession('first'), null, 'synced tombstones remain effective');
  await store.createSession(session('second'));
  await store.appendLocations([point(0)]);
  await store.applyRemoteDiscards([{ id: 'second', account_id: 'owner', learner_id: 'learner' }]);
  assert.equal(await store.getSession('second'), null);
  assert.equal((await store.readPoints('second')).length, 0);
  await store.createSession(session('third'));
  await store.changeSession('third', s => ({ ...s, status: 'finished', ended_at: start + 10000, reviewed_at: start + 20000 }));
  await assert.rejects(store.discardSession('third', 'owner'), /already been saved/);
});
