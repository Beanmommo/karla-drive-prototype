import assert from 'node:assert/strict';
import test from 'node:test';

import { getAge } from '../src/features/learners/model.ts';
import { formatPracticeHours, getPracticeHourTargets, practiceStatsKey, readPracticeStats } from '../src/features/learners/practiceStats.ts';

const empty = { totalMinutes: 0, nightMinutes: 0 };
const makeStorage = () => {
  const values = new Map();
  return {
    values,
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
  };
};

test('requires 120 total / 20 night hours until the twenty-first birthday', () => {
  const dob = '2005-09-23';
  assert.deepEqual(getPracticeHourTargets(getAge(dob, new Date(2026, 8, 22))), { total: 120, night: 20 });
  assert.equal(getPracticeHourTargets(getAge(dob, new Date(2026, 8, 23))), null);
  assert.equal(getPracticeHourTargets(getAge(dob, new Date(2026, 8, 24))), null);
  assert.equal(getPracticeHourTargets(getAge('invalid')), null);
});

test('initializes and persists zero totals without creating any sessions', async () => {
  const storage = makeStorage();
  assert.deepEqual(await readPracticeStats(storage, 'account', 'learner'), empty);
  assert.deepEqual(JSON.parse(storage.values.get(practiceStatsKey('account', 'learner'))), empty);
  assert.equal(storage.values.size, 1);
});

test('restores totals without mixing learners or accounts', async () => {
  const storage = makeStorage();
  const recorded = { totalMinutes: 90, nightMinutes: 30 };
  await storage.setItem(practiceStatsKey('a', 'one'), JSON.stringify(recorded));
  assert.deepEqual(await readPracticeStats(storage, 'a', 'one'), recorded);
  assert.deepEqual(await readPracticeStats(storage, 'a', 'two'), empty);
  assert.deepEqual(await readPracticeStats(storage, 'b', 'one'), empty);
  assert.deepEqual(await readPracticeStats(storage, 'a', 'one'), recorded);
});

test('repairs malformed or impossible cached totals', async () => {
  const storage = makeStorage();
  const key = practiceStatsKey('account', 'learner');
  for (const raw of ['oops', 'null', '[]', '{}', '{"totalMinutes":60}',
    ...[
      { totalMinutes: -1, nightMinutes: 0 },
      { totalMinutes: 60, nightMinutes: 61 },
      { totalMinutes: '60', nightMinutes: 0 },
      { totalMinutes: 0.5, nightMinutes: 0 },
      { totalMinutes: 60, nightMinutes: -1 },
    ].map(value => JSON.stringify(value)),
  ]) {
    await storage.setItem(key, raw);
    assert.deepEqual(await readPracticeStats(storage, 'account', 'learner'), empty);
    assert.deepEqual(JSON.parse(storage.values.get(key)), empty);
  }
});

test('tolerates unavailable storage without overwriting an unread cache', async () => {
  let writes = 0;
  const unavailable = {
    async getItem() { throw new Error('read unavailable'); },
    async setItem() { writes++; },
  };
  assert.deepEqual(await readPracticeStats(unavailable, 'a', 'b'), empty);
  assert.equal(writes, 0);
  const readOnly = { async getItem() { return null; }, async setItem() { throw new Error('write unavailable'); } };
  assert.deepEqual(await readPracticeStats(readOnly, 'a', 'b'), empty);
});

test('formats hours without rounding incomplete practice up to a requirement', () => {
  assert.equal(formatPracticeHours(0), '0');
  assert.equal(formatPracticeHours(90), '1.5');
  assert.equal(formatPracticeHours(7199), '119.9');
  assert.equal(formatPracticeHours(7200), '120');
  assert.equal(formatPracticeHours(1200), '20');
});
