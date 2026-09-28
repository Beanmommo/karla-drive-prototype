import type { Coordinate } from './model';

// Use every recorded point for framing, even when the displayed line is simplified.
export function trailBounds(points: Coordinate[]): Coordinate[] {
  if (!points.length) return [];
  let north = -Infinity, south = Infinity, east = -Infinity, west = Infinity;
  for (const point of points) {
    north = Math.max(north, point.latitude); south = Math.min(south, point.latitude);
    east = Math.max(east, point.longitude); west = Math.min(west, point.longitude);
  }
  return [{ latitude: south, longitude: west }, { latitude: north, longitude: east }];
}
