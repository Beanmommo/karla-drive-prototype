import assert from 'node:assert/strict';
import test from 'node:test';
import { addPoints, appleMapsUrl, durationOptions, emptyMetrics, elapsedSeconds, gapSeconds, isNight, validDuration } from '../src/features/practice/model.ts';
import { generateLoop, matchRecordedPoints, matchedEvents, offsetPoint } from '../src/features/practice/routing.ts';

const start = Date.parse('2026-09-24T02:00:00Z');
const origin = { latitude: -37.8136, longitude: 144.9631 };
function session() { return { id: 'session', status: 'active', started_at: start, ended_at: null, metrics: emptyMetrics() }; }
function point(seconds, meters = seconds * 5, speed = 5, accuracy = 5) {
  return { ...offsetPoint(origin, meters, 90), timestamp: start + seconds * 1000, speed, accuracy, altitude: 0, heading: 90 };
}
test('duration choices cover 15 minutes to 12 hours in exact 15 minute steps', () => {
  assert.equal(durationOptions.length, 48);
  assert.ok(durationOptions.every((choice, index) => Number(choice.value) === (index + 1) * 15));
  assert.ok(validDuration(45)); assert.ok(validDuration(720));
  for (const value of [0, 14, 16, 721, Infinity, NaN]) assert.equal(validDuration(value), false);
});
test('driving intervals and stationary intervals are classified separately, with one event per transition', () => {
  const samples = [point(0, 0, 0), point(5, 0, 0), point(10, 25), point(15, 50), point(20, 75), point(25, 75, 0), point(30, 75, 0), point(35, 75, 0)];
  const result = addPoints(session(), samples);
  assert.equal(result.session.metrics.movingSeconds, 15);
  assert.equal(result.session.metrics.stoppedSeconds, 20);
  assert.ok(Math.abs(result.session.metrics.distanceMeters - 75) < 0.1);
  assert.deepEqual(result.events.map(e => e.kind), ['start', 'stop']);
  assert.equal(result.session.metrics.maxSpeed, 5);
  const closed = { ...result.session, status: 'finished', ended_at: start + 40000 };
  assert.equal(elapsedSeconds(closed), 40); assert.equal(gapSeconds(closed), 5);
  assert.equal(addPoints(closed, [point(45)]).points.length, 0);
});
test('duplicates, out-of-order callbacks, poor GPS and impossible jumps do not inflate totals', () => {
  const first = addPoints(session(), [point(0), point(5), point(10)]);
  const second = addPoints(first.session, [point(5), point(10), point(15, 100000), point(20, 100, 5, 80), point(25)]);
  assert.equal(second.points.length, 1);
  assert.equal(second.session.metrics.movingSeconds, 25);
  assert.ok(Math.abs(second.session.metrics.distanceMeters - 125) < 0.1);
});
test('a GPS outage adds no inferred time or distance and resets transition evidence', () => {
  const result = addPoints(session(), [point(0), point(5), point(120, 10000), point(125, 10025)]);
  assert.equal(result.session.metrics.movingSeconds, 10);
  assert.ok(Math.abs(result.session.metrics.distanceMeters - 50) < 0.1);
  assert.equal(gapSeconds({ ...result.session, ended_at: start + 125000 }), 115);
});
test('solar calculation distinguishes Melbourne midday from midnight', () => {
  assert.equal(isNight(origin, Date.parse('2026-09-24T02:00:00Z')), false);
  assert.equal(isNight(origin, Date.parse('2026-09-24T14:00:00Z')), true);
});
test('Apple Maps receives generated loops; recording without a route has no Maps handoff', () => {
  const stops = [offsetPoint(origin, 1000, 0), offsetPoint(origin, 1000, 90)];
  const url = new URL(appleMapsUrl({ mode: 'generated', origin, stops }));
  assert.equal(url.searchParams.get('source'), url.searchParams.get('destination'));
  assert.deepEqual(url.searchParams.getAll('waypoint'), stops.map(p => p.latitude + ',' + p.longitude));
  assert.equal(url.searchParams.get('mode'), 'driving');
  assert.equal(appleMapsUrl({ mode: 'destination' }), null);
});
test('only confidently matched, traversed maneuvers count; gaps and future maneuvers do not', () => {
  const samples = [point(0), point(5), point(10), point(15), point(20), point(25)];
  const maneuver = { type: 'turn', modifier: 'right', location: [samples[2].longitude, samples[2].latitude] };
  const route = { confidence: 0.95, legs: [{ steps: [{ maneuver }] }] };
  assert.deepEqual(matchedEvents('drive', samples, [route]).map(e => e.kind), ['right_turn']);
  assert.equal(matchedEvents('drive', samples, [{ ...route, confidence: 0.5 }]).length, 0);
  assert.equal(matchedEvents('drive', samples.slice(0, 4), [route]).length, 0);
  const gaps = samples.map((p, i) => ({ ...p, timestamp: p.timestamp + (i > 2 ? 60000 : 0) }));
  assert.equal(matchedEvents('drive', gaps, [route]).length, 0);
});
test('loop generation adapts to road duration and returns snapped intermediate stops', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async input => {
    calls++;
    const path = new URL(input).pathname;
    const coordinates = path.split('/').at(-1).split(';').map(p => p.split(',').map(Number));
    return { ok: true, status: 200, json: async () => ({ code: 'Ok', waypoints: coordinates.map(location => ({ location, distance: 0 })),
      routes: [{ duration: calls === 1 ? 5000 : 2700, distance: 25000, geometry: { coordinates }, legs: [] }] }) };
  });
  const route = await generateLoop(origin, 45, 'pk.test');
  assert.equal(calls, 2); assert.equal(route.stops.length, 3); assert.equal(route.estimatedSeconds, 2700);
  assert.deepEqual(route.origin, origin);
  await assert.rejects(generateLoop(origin, 14, 'pk.test'), /15-minute/);
});
test('map matching caps requests at 100 and removes duplicate whole-second timestamps', async t => {
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(input); const timestamps = url.searchParams.get('timestamps').split(';').map(Number);
    assert.ok(timestamps.length <= 100);
    assert.ok(timestamps.every((v, i) => !i || v > timestamps[i - 1]));
    assert.equal(url.searchParams.get('waypoints'), '0;' + (timestamps.length - 1));
    return { ok: true, status: 200, json: async () => ({ code: 'NoMatch' }) };
  });
  assert.deepEqual(await matchRecordedPoints('drive', Array.from({ length: 210 }, (_, i) => point(i * 0.5)), 'pk.test'), []);
});
