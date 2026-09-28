import assert from 'node:assert/strict';
import test from 'node:test';
import { filterPracticeHistory } from '../src/features/practice/history.ts';
import { addPoints, emptyMetrics, isNight } from '../src/features/practice/model.ts';

const origin = { latitude: -37.8136, longitude: 144.9631 };
const row = (id, nightSeconds, overrides = {}) => ({
  session: { id, status: 'finished', metrics: { ...emptyMetrics(), movingSeconds: 3600, nightSeconds }, ...overrides },
  deleted: false,
});

test('night history includes pure night, mixed and sub-minute sessions, preserving order', () => {
  const sessions = [row('day', 0), row('mixed', 600), row('night', 3600), row('brief-night', 0.5),
    row('active', 600, { status: 'active' }), { ...row('discarded', 600), deleted: true }];
  assert.deepEqual(filterPracticeHistory(sessions, 'night').map(row => row.session.id), ['mixed', 'night', 'brief-night']);
  assert.deepEqual(filterPracticeHistory(sessions, 'all').map(row => row.session.id), ['day', 'mixed', 'night', 'brief-night']);
  assert.deepEqual(filterPracticeHistory([row('day', 0)], 'night'), []);
});

for (const [transition, start, startsAtNight] of [
  ['sunset', '2026-09-24T07:30:00Z', false],
  ['sunrise', '2026-09-23T19:30:00Z', true],
]) {
  test(`a drive crossing ${transition} records both day and night and appears in night history`, () => {
    const started_at = Date.parse(start);
    const points = Array.from({ length: 241 }, (_, i) => ({ ...origin, timestamp: started_at + i * 15000,
      speed: 5, accuracy: 5, altitude: 0, heading: 90 }));
    assert.equal(isNight(origin, points[0].timestamp), startsAtNight);
    assert.equal(isNight(origin, points.at(-1).timestamp), !startsAtNight);
    const recorded = addPoints({ id: transition, status: 'active', started_at, metrics: emptyMetrics() }, points).session;
    const { movingSeconds, stoppedSeconds, nightSeconds } = recorded.metrics;
    assert.equal(movingSeconds + stoppedSeconds, 3600);
    assert.ok(nightSeconds > 0 && nightSeconds < 3600);
    const finished = { session: { ...recorded, status: 'finished', ended_at: points.at(-1).timestamp }, deleted: false };
    assert.deepEqual(filterPracticeHistory([finished], 'night'), [finished]);
  });
}

test('GPS gaps at night never become recorded night time', () => {
  const started_at = Date.parse('2026-09-24T14:00:00Z');
  const points = [0, 15, 120, 135].map(seconds => ({ ...origin, timestamp: started_at + seconds * 1000,
    speed: 0, accuracy: 5, altitude: 0, heading: 90 }));
  const { metrics } = addPoints({ id: 'gap', status: 'active', started_at, metrics: emptyMetrics() }, points).session;
  assert.equal(metrics.stoppedSeconds, 30);
  assert.equal(metrics.nightSeconds, 30);
});
