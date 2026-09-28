import type { Coordinate } from './model';
import { trailBounds } from './trailBounds.ts';

function mercator(point: Coordinate) {
  const latitude = Math.max(-85.0511, Math.min(85.0511, point.latitude)) * Math.PI / 180;
  return { x: (point.longitude + 180) / 360, y: (1 - Math.log(Math.tan(Math.PI / 4 + latitude / 2)) / Math.PI) / 2 };
}

// Share an exact Web Mercator camera between street-map tiles and the GPS overlay.
export function trailViewport(points: Coordinate[], width = 320, height = 190, padding = 28) {
  if (!points.length) return null;
  const [southwest, northeast] = trailBounds(points);
  const sw = mercator(southwest), ne = mercator(northeast);
  const centerX = (sw.x + ne.x) / 2, centerY = (sw.y + ne.y) / 2;
  const zoom = Math.max(0, Math.floor(Math.min(16,
    Math.log2((width - 2 * padding) / (512 * (ne.x - sw.x))),
    Math.log2((height - 2 * padding) / (512 * (sw.y - ne.y))),
  ) * 100) / 100);
  const scale = 512 * 2 ** zoom;
  const longitude = centerX * 360 - 180;
  const latitude = Math.atan(Math.sinh(Math.PI * (1 - 2 * centerY))) * 180 / Math.PI;
  const tileZoom = Math.floor(zoom) + 1;
  const tileCount = 2 ** tileZoom;
  const tileSize = scale / tileCount;
  const left = centerX * scale - width / 2, top = centerY * scale - height / 2;
  const tiles: { id: string; url: string; x: number; y: number; size: number }[] = [];
  for (let y = Math.max(0, Math.floor(top / tileSize)); y < Math.min(tileCount, Math.ceil((top + height) / tileSize)); y++) {
    for (let x = Math.floor(left / tileSize); x < Math.ceil((left + width) / tileSize); x++) {
      const tileX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push({ id: `${tileZoom}/${tileX}/${y}`, url: `https://tile.openstreetmap.org/${tileZoom}/${tileX}/${y}.png`,
        x: x * tileSize - left, y: y * tileSize - top, size: tileSize });
    }
  }
  return { longitude, latitude, zoom, width, height, tiles,
    project(point: Coordinate) {
      const projected = mercator(point);
      return [width / 2 + (projected.x - centerX) * scale, height / 2 + (projected.y - centerY) * scale];
    },
  };
}
