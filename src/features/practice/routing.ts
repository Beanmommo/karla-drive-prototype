import { distance, validDuration, type Coordinate, type PracticeEvent, type PracticeRoute, type TrackPoint } from './model.ts';

type Maneuver = { type: string; modifier?: string; location: [number, number] };
type MapboxRoute = { duration: number; distance: number; confidence?: number;
  geometry: { coordinates: [number, number][] }; legs: { steps: { maneuver: Maneuver }[] }[] };
type MapboxResponse = { code: string; routes?: MapboxRoute[]; matchings?: MapboxRoute[];
  waypoints?: { location: [number, number]; distance: number }[] };
const coords = (points: Coordinate[]) => points.map(p => p.longitude.toFixed(6) + ',' + p.latitude.toFixed(6)).join(';');

async function request(path: string, params: URLSearchParams, token: string, signal?: AbortSignal): Promise<MapboxResponse> {
  if (!token.startsWith('pk.')) throw new Error('Mapbox is not configured. Add a public MAPBOX_ACCESS_TOKEN and restart the app server.');
  params.set('access_token', token);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 18000);
  try {
    const response = await fetch('https://api.mapbox.com/' + path + '?' + params.toString(), { signal: controller.signal });
    if (response.status === 401 || response.status === 403) throw new Error('Mapbox access was rejected. Check the public token and its permissions.');
    if (response.status === 429) throw new Error('Route service is busy. Please try again shortly.');
    if (!response.ok) throw new Error('The route service could not be reached. Check your connection.');
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted) throw new Error(signal?.aborted ? 'Route generation cancelled.' : 'Route service timed out. Try again.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
export function offsetPoint(origin: Coordinate, meters: number, bearing: number): Coordinate {
  const rad = Math.PI / 180;
  const lat = origin.latitude * rad;
  const lon = origin.longitude * rad;
  const d = meters / 6371000;
  const theta = bearing * rad;
  const next = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(theta));
  const longitude = (lon + Math.atan2(Math.sin(theta) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(next))) / rad;
  return { latitude: next / rad, longitude: ((longitude + 540) % 360) - 180 };
}
export async function generateLoop(origin: Coordinate, minutes: number, token: string, signal?: AbortSignal): Promise<PracticeRoute> {
  if (!validDuration(minutes)) throw new Error('Choose 15 minutes to 12 hours, in 15-minute steps.');
  let radius = minutes * 500 / (Math.PI * 2);
  const rotation = Math.random() * 360;
  let best: PracticeRoute | null = null;
  let errorMessage = 'No suitable driving loop was found. Try another duration or use Start recording.';
  for (let attempt = 0; attempt < 6; attempt++) {
    if (signal?.aborted) throw new Error('Route generation cancelled.');
    const heading = rotation + (attempt % 3) * 100;
    const center = offsetPoint(origin, radius, heading);
    const stops = [90, 180, 270].map(angle => offsetPoint(center, radius, heading + 180 + angle));
    const waypoints = [origin, ...stops, origin];
    const params = new URLSearchParams({ geometries: 'geojson', overview: 'full', steps: 'true',
      radiuses: waypoints.map(() => String(Math.min(5000, Math.max(750, radius * 0.3)))).join(';'),
      continue_straight: 'true' });
    try {
      const result = await request('directions/v5/mapbox/driving/' + coords(waypoints), params, token, signal);
      const route = result.routes?.[0];
      if (result.code !== 'Ok' || !route || !result.waypoints || route.distance < 500) continue;
      const candidate: PracticeRoute = { mode: 'generated', requestedMinutes: minutes, origin,
        stops: result.waypoints.slice(1, -1).map(p => ({ latitude: p.location[1], longitude: p.location[0] })),
        geometry: route.geometry.coordinates.map(p => ({ latitude: p[1], longitude: p[0] })),
        estimatedSeconds: route.duration, distanceMeters: route.distance };
      if (!best || Math.abs(route.duration - minutes * 60) < Math.abs(best.estimatedSeconds - minutes * 60)) best = candidate;
      if (Math.abs(route.duration / (minutes * 60) - 1) <= 0.15) break;
      radius *= Math.max(0.45, Math.min(2, minutes * 60 / route.duration));
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : errorMessage;
      if (/access|token|busy|cancelled/i.test(errorMessage)) throw error;
    }
  }
  if (!best || best.estimatedSeconds < minutes * 60 * 0.5 || best.estimatedSeconds > minutes * 60 * 1.6) throw new Error(errorMessage);
  return best;
}

// Infer maneuvers from matched *recorded* travel, never from a planned route.
export function matchedEvents(sessionId: string, points: TrackPoint[], routes: MapboxRoute[]): PracticeEvent[] {
  const events: PracticeEvent[] = [];
  for (const route of routes) {
    const confidence = route.confidence ?? 0;
    if (confidence < 0.8) continue;
    for (const leg of route.legs) for (const step of leg.steps) {
      const m = step.maneuver;
      const kind = m.type === 'roundabout' || m.type === 'rotary' ? 'roundabout'
        : m.type === 'merge' ? 'merge'
          : m.type === 'turn' && m.modifier?.includes('left') ? 'left_turn'
            : m.type === 'turn' && m.modifier?.includes('right') ? 'right_turn' : null;
      if (!kind) continue;
      const coordinate = { latitude: m.location[1], longitude: m.location[0] };
      let nearest = 0;
      for (let i = 1; i < points.length; i++) if (distance(points[i], coordinate) < distance(points[nearest], coordinate)) nearest = i;
      // Need approach and departure observations to avoid claiming an untraversed maneuver.
      if (nearest === 0 || nearest >= points.length - 2 || distance(points[nearest], coordinate) > 45) continue;
      if (points[nearest + 2].timestamp - points[nearest - 1].timestamp > 30000) continue;
      if (distance(points[nearest + 2], coordinate) < 12) continue;
      const point = points[nearest];
      const description = kind === 'roundabout' ? 'Roundabout detected' : kind === 'merge' ? 'Possible merge detected'
        : kind === 'left_turn' ? 'Left turn detected' : 'Right turn detected';
      events.push({ id: sessionId + ':' + kind + ':' + point.timestamp, kind, timestamp: point.timestamp,
        ...coordinate, confidence, source: 'mapbox', description });
    }
  }
  return events;
}
export async function matchRecordedPoints(sessionId: string, points: TrackPoint[], token: string): Promise<PracticeEvent[]> {
  if (points.length < 4) return [];
  // Mapbox timestamps are whole seconds and must be strictly increasing.
  const samples = points.filter((p, i) => i === 0 || Math.floor(p.timestamp / 1000) > Math.floor(points[i - 1].timestamp / 1000)).slice(0, 100);
  if (samples.length < 4) return [];
  const params = new URLSearchParams({ geometries: 'geojson', overview: 'full', steps: 'true', tidy: 'true',
    waypoints: '0;' + (samples.length - 1),
    timestamps: samples.map(p => String(Math.floor(p.timestamp / 1000))).join(';'),
    radiuses: samples.map(p => String(Math.min(50, Math.max(10, p.accuracy ?? 25)))).join(';') });
  const result = await request('matching/v5/mapbox/driving/' + coords(samples), params, token);
  if (result.code === 'NoMatch' || result.code === 'NoSegment') return [];
  if (result.code !== 'Ok') throw new Error('Road matching is unavailable. GPS recording continues.');
  return matchedEvents(sessionId, samples, result.matchings ?? []);
}
