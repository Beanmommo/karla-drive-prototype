import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSessionStart } from '../src/features/practice/sessionLabels.ts';
import { trailBounds } from '../src/features/practice/trailBounds.ts';
import { trailViewport } from '../src/features/practice/trailViewport.ts';

test('session captions use local calendar days, a 12-hour start time, and dates for older drives', () => {
  const now = new Date(2026, 8, 28, 18, 0).getTime();
  assert.equal(formatSessionStart(new Date(2026, 8, 28, 6, 5).getTime(), now), 'Today at 6:05 am');
  assert.equal(formatSessionStart(new Date(2026, 8, 27, 18, 30).getTime(), now), 'Yesterday at 6:30 pm');
  assert.equal(formatSessionStart(new Date(2026, 8, 26, 12, 0).getTime(), now), '26 Sept at 12:00 pm');
  assert.equal(formatSessionStart(new Date(2025, 8, 28, 0, 0).getTime(), now), '28 Sept 2025 at 12:00 am');
});

test('relative dates change at local midnight and handle a year boundary', () => {
  const start = new Date(2026, 11, 31, 23, 59).getTime();
  assert.equal(formatSessionStart(start, start), 'Today at 11:59 pm');
  assert.equal(formatSessionStart(start, new Date(2027, 0, 1, 0, 1).getTime()), 'Yesterday at 11:59 pm');
});

test('trail framing includes extrema between sampled points and both ends of a long recording', () => {
  const points = Array.from({ length: 10000 }, (_, i) => ({ latitude: -37.8 + i * 0.000001, longitude: 144.9 }));
  points[4321] = { latitude: -37.9, longitude: 144.8 };
  points[7653] = { latitude: -37.7, longitude: 145.0 };
  const [southwest, northeast] = trailBounds(points);
  for (const point of points) {
    assert.ok(point.latitude >= southwest.latitude && point.latitude <= northeast.latitude);
    assert.ok(point.longitude >= southwest.longitude && point.longitude <= northeast.longitude);
  }
  assert.deepEqual([southwest, northeast], [{ latitude: -37.9, longitude: 144.8 }, { latitude: -37.7, longitude: 145.0 }]);
});

test('trail framing supports absent GPS and a stationary recording', () => {
  assert.deepEqual(trailBounds([]), []);
  const point = { latitude: -37.8136, longitude: 144.9631 };
  assert.deepEqual(trailBounds([point]), [point, point]);
  assert.deepEqual(trailBounds([point, point]), [point, point]);
});

test('street-map camera keeps wide and tall trails inside the preview padding', () => {
  for (const points of [
    [{ latitude: -37.81, longitude: 144.8 }, { latitude: -37.82, longitude: 145.1 }],
    [{ latitude: -37.7, longitude: 144.96 }, { latitude: -38.0, longitude: 144.97 }],
  ]) {
    const viewport = trailViewport(points);
    for (const point of points) {
      const [x, y] = viewport.project(point);
      assert.ok(x >= 28 && x <= 292, `horizontal padding: ${x}`);
      assert.ok(y >= 28 && y <= 162, `vertical padding: ${y}`);
    }
    const [centerX, centerY] = viewport.project(viewport);
    assert.ok(Math.abs(centerX - 160) < 1e-6);
    assert.ok(Math.abs(centerY - 95) < 1e-6);
  }
});

test('street-map camera handles missing and stationary GPS without an invalid zoom', () => {
  assert.equal(trailViewport([]), null);
  const point = { latitude: -37.8136, longitude: 144.9631 };
  const viewport = trailViewport([point, point]);
  assert.equal(viewport.zoom, 16);
  assert.deepEqual(viewport.project(point), [160, 95]);
});

test('street-map tiles cover the viewport without fetching tiles outside it', () => {
  const viewport = trailViewport([{ latitude: -37.818, longitude: 144.964 }, { latitude: -37.807, longitude: 144.957 }]);
  assert.ok(viewport.tiles.length <= 6);
  for (const tile of viewport.tiles) {
    assert.ok(tile.x < 320 && tile.x + tile.size > 0);
    assert.ok(tile.y < 190 && tile.y + tile.size > 0);
  }
  for (const [x, y] of [[0, 0], [319, 0], [0, 189], [319, 189], [160, 95]]) {
    assert.ok(viewport.tiles.some(tile => x >= tile.x && x <= tile.x + tile.size && y >= tile.y && y <= tile.y + tile.size));
  }
});
