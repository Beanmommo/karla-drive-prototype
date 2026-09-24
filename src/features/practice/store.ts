import * as SQLite from 'expo-sqlite';

import { addPoints, distance, type PracticeEvent, type PracticeSession, type StoredSession, type TrackPoint } from './model';

type Row = { data: string; revision: number; dirty: number; sync_error: string | null };
type Tombstone = { id: string; account_id: string; learner_id: string };
let database: Promise<SQLite.SQLiteDatabase> | undefined;
let writes: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();
export function subscribePractice(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function changed() { for (const listener of listeners) listener(); }
async function db() {
  database ??= (async () => {
    const connection = await SQLite.openDatabaseAsync('karla-practice-v1.db');
    await connection.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY, account_id TEXT NOT NULL, learner_id TEXT NOT NULL,
        status TEXT NOT NULL, ended_at REAL, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
        dirty INTEGER NOT NULL DEFAULT 1, sync_error TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS one_active_practice ON sessions(status) WHERE status = 'active';
      CREATE INDEX IF NOT EXISTS practice_history ON sessions(account_id, learner_id, ended_at DESC);
      CREATE TABLE IF NOT EXISTS points (
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        timestamp REAL NOT NULL, data TEXT NOT NULL, synced INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(session_id, timestamp)
      );
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        timestamp REAL NOT NULL, data TEXT NOT NULL, synced INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS discarded (
        id TEXT PRIMARY KEY, account_id TEXT NOT NULL, learner_id TEXT NOT NULL, synced INTEGER NOT NULL DEFAULT 0
      );
    `);
    return connection;
  })();
  return database;
}
function decode(row: Row): StoredSession {
  return { session: JSON.parse(row.data), revision: row.revision, dirty: !!row.dirty, deleted: false, syncError: row.sync_error };
}
async function write<T>(operation: (tx: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const result = writes.then(async () => {
    const connection = await db();
    let value!: T;
    await connection.withExclusiveTransactionAsync(async tx => { value = await operation(tx); });
    changed();
    return value;
  });
  writes = result.catch(() => {});
  return result;
}
async function update(tx: SQLite.SQLiteDatabase, session: PracticeSession) {
  await tx.runAsync('UPDATE sessions SET status=?, ended_at=?, data=?, revision=revision+1, dirty=1 WHERE id=?',
    session.status, session.ended_at, JSON.stringify(session), session.id);
}
export async function getSession(id: string, accountId?: string): Promise<StoredSession | null> {
  const connection = await db();
  const row = accountId
    ? await connection.getFirstAsync<Row>('SELECT * FROM sessions WHERE id=? AND account_id=?', id, accountId)
    : await connection.getFirstAsync<Row>('SELECT * FROM sessions WHERE id=?', id);
  return row ? decode(row) : null;
}
export async function getActiveSession(): Promise<StoredSession | null> {
  const row = await (await db()).getFirstAsync<Row>("SELECT * FROM sessions WHERE status='active'");
  return row ? decode(row) : null;
}
export async function listSessions(accountId: string, learnerId?: string): Promise<StoredSession[]> {
  const connection = await db();
  const rows = learnerId
    ? await connection.getAllAsync<Row>('SELECT * FROM sessions WHERE account_id=? AND learner_id=? ORDER BY ended_at DESC', accountId, learnerId)
    : await connection.getAllAsync<Row>('SELECT * FROM sessions WHERE account_id=? ORDER BY ended_at DESC', accountId);
  return rows.map(decode);
}
export async function createSession(session: PracticeSession) {
  await write(async tx => {
    if (await tx.getFirstAsync("SELECT id FROM sessions WHERE status='active'")) throw new Error('A practice session is already recording.');
    await tx.runAsync('INSERT INTO sessions(id,account_id,learner_id,status,ended_at,data) VALUES (?,?,?,?,?,?)',
      session.id, session.account_id, session.learner_id, session.status, session.ended_at, JSON.stringify(session));
  });
}
export async function changeSession(id: string, transform: (session: PracticeSession) => PracticeSession) {
  return write(async tx => {
    const row = await tx.getFirstAsync<Row>('SELECT * FROM sessions WHERE id=?', id);
    if (!row) return null;
    const next = transform(decode(row).session);
    await update(tx, next);
    return next;
  });
}
export async function appendLocations(input: TrackPoint[]): Promise<{ session: PracticeSession; events: PracticeEvent[] } | null> {
  return write(async tx => {
    const row = await tx.getFirstAsync<Row>("SELECT * FROM sessions WHERE status='active'");
    if (!row) return null;
    const result = addPoints(decode(row).session, input);
    for (const point of result.points) await tx.runAsync('INSERT OR IGNORE INTO points(session_id,timestamp,data) VALUES (?,?,?)',
      result.session.id, point.timestamp, JSON.stringify(point));
    for (const event of result.events) await tx.runAsync('INSERT OR IGNORE INTO events(id,session_id,timestamp,data) VALUES (?,?,?,?)',
      event.id, result.session.id, event.timestamp, JSON.stringify(event));
    if (result.points.length) await update(tx, result.session);
    return { session: result.session, events: result.events };
  });
}
export async function readPoints(id: string, after = 0, limit = 100000, unsynced = false): Promise<TrackPoint[]> {
  const rows = await (await db()).getAllAsync<{ data: string }>('SELECT data FROM points WHERE session_id=? AND timestamp>?'
    + (unsynced ? ' AND synced=0' : '') + ' ORDER BY timestamp LIMIT ?', id, after, limit);
  return rows.map(row => JSON.parse(row.data));
}
export async function readEvents(id: string, unsynced = false): Promise<PracticeEvent[]> {
  const rows = await (await db()).getAllAsync<{ data: string }>('SELECT data FROM events WHERE session_id=?'
    + (unsynced ? ' AND synced=0' : '') + ' ORDER BY timestamp', id);
  return rows.map(row => JSON.parse(row.data));
}
export async function appendMatchedEvents(id: string, events: PracticeEvent[], matchedUntil: number): Promise<PracticeEvent[]> {
  return write(async tx => {
    const row = await tx.getFirstAsync<Row>('SELECT * FROM sessions WHERE id=?', id);
    if (!row) return [];
    const existing = (await tx.getAllAsync<{ data: string }>('SELECT data FROM events WHERE session_id=? ORDER BY timestamp', id))
      .map(row => JSON.parse(row.data) as PracticeEvent);
    const session = decode(row).session;
    const added: PracticeEvent[] = [];
    for (const event of events) {
      if (event.timestamp < session.started_at || (session.ended_at !== null && event.timestamp > session.ended_at)) continue;
      if ([...existing, ...added].some(previous => previous.kind === event.kind
        && Math.abs(previous.timestamp - event.timestamp) < 45000 && distance(previous, event) < 60)) continue;
      await tx.runAsync('INSERT OR IGNORE INTO events(id,session_id,timestamp,data) VALUES (?,?,?,?)', event.id, id, event.timestamp, JSON.stringify(event));
      added.push(event);
    }
    await update(tx, { ...session, matched_until: Math.max(session.matched_until, matchedUntil), detection_error: null });
    return added;
  });
}
export async function discardSession(id: string, accountId: string) {
  await write(async tx => {
    const row = await tx.getFirstAsync<Row>('SELECT * FROM sessions WHERE id=? AND account_id=?', id, accountId);
    if (!row) return;
    const { session } = decode(row);
    if (session.status === 'active') throw new Error('Stop recording before discarding.');
    if (session.reviewed_at) throw new Error('This review has already been saved.');
    await tx.runAsync('INSERT OR IGNORE INTO discarded(id,account_id,learner_id) VALUES (?,?,?)', id, accountId, session.learner_id);
    await tx.runAsync('DELETE FROM points WHERE session_id=?', id);
    await tx.runAsync('DELETE FROM events WHERE session_id=?', id);
    await tx.runAsync('DELETE FROM sessions WHERE id=?', id);
  });
}
export async function applyRemoteDiscards(items: Tombstone[]) {
  if (!items.length) return;
  await write(async tx => {
    for (const item of items) {
      await tx.runAsync('INSERT INTO discarded(id,account_id,learner_id,synced) VALUES (?,?,?,1) ON CONFLICT(id) DO UPDATE SET synced=1', item.id, item.account_id, item.learner_id);
      await tx.runAsync('DELETE FROM points WHERE session_id=?', item.id);
      await tx.runAsync('DELETE FROM events WHERE session_id=?', item.id);
      await tx.runAsync('DELETE FROM sessions WHERE id=? AND account_id=?', item.id, item.account_id);
    }
  });
}
export async function pendingDiscards(accountId: string): Promise<Tombstone[]> {
  return (await db()).getAllAsync<Tombstone>('SELECT id,account_id,learner_id FROM discarded WHERE account_id=? AND synced=0', accountId);
}
export async function confirmDiscard(id: string) { await write(tx => tx.runAsync('UPDATE discarded SET synced=1 WHERE id=?', id)); }
export async function markSynced(id: string, revision: number, pointTimestamps: number[], eventIds: string[], conflicts: string[]) {
  await write(async tx => {
    for (const timestamp of pointTimestamps) await tx.runAsync('UPDATE points SET synced=1 WHERE session_id=? AND timestamp=?', id, timestamp);
    for (const eventId of eventIds) await tx.runAsync('UPDATE events SET synced=1 WHERE session_id=? AND id=?', id, eventId);
    const row = await tx.getFirstAsync<Row>('SELECT * FROM sessions WHERE id=?', id);
    if (!row) return;
    const session = decode(row).session;
    await tx.runAsync('UPDATE sessions SET dirty=CASE WHEN revision=? THEN 0 ELSE dirty END, sync_error=NULL, data=? WHERE id=?',
      revision, JSON.stringify({ ...session, review_conflicts: conflicts }), id);
  });
}
export async function setSyncError(id: string, message: string) {
  await write(tx => tx.runAsync('UPDATE sessions SET sync_error=? WHERE id=?', message, id));
}
export async function cacheRemoteSession(session: PracticeSession, revision: number) {
  await write(async tx => {
    if (await tx.getFirstAsync('SELECT id FROM discarded WHERE id=?', session.id)) return;
    const existing = await tx.getFirstAsync<Row>('SELECT * FROM sessions WHERE id=?', session.id);
    // Never adopt an active session recorded by another installation.
    if (session.status === 'active' || existing?.dirty) return;
    if (existing && existing.revision > revision) return;
    await tx.runAsync('INSERT INTO sessions(id,account_id,learner_id,status,ended_at,data,revision,dirty) VALUES (?,?,?,?,?,?,?,0)'
      + ' ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status,ended_at=excluded.ended_at,revision=excluded.revision,dirty=0',
    session.id, session.account_id, session.learner_id, session.status, session.ended_at, JSON.stringify(session), revision);
  });
}
export async function cacheRemoteDetails(id: string, points: TrackPoint[], events: PracticeEvent[]) {
  await write(async tx => {
    if (!await tx.getFirstAsync('SELECT id FROM sessions WHERE id=?', id)) return;
    for (const point of points) await tx.runAsync('INSERT OR IGNORE INTO points(session_id,timestamp,data,synced) VALUES (?,?,?,1)', id, point.timestamp, JSON.stringify(point));
    for (const event of events) await tx.runAsync('INSERT OR IGNORE INTO events(id,session_id,timestamp,data,synced) VALUES (?,?,?,?,1)', event.id, id, event.timestamp, JSON.stringify(event));
  });
}
