import type { ModuleId, ModuleStatus } from '../modules/model';

export type Coordinate = { latitude: number; longitude: number };
export type TrackPoint = Coordinate & {
  timestamp: number; accuracy: number | null; speed: number | null;
  heading: number | null; altitude: number | null;
};
export type PracticeRoute = {
  mode: 'generated' | 'destination'; requestedMinutes: number;
  origin: Coordinate; stops: Coordinate[]; geometry: Coordinate[];
  estimatedSeconds: number; distanceMeters: number;
};
export type EventKind = 'start' | 'stop' | 'left_turn' | 'right_turn' | 'roundabout' | 'merge';
export type PracticeEvent = {
  id: string; kind: EventKind; timestamp: number; latitude: number; longitude: number;
  confidence: number; source: 'gps' | 'mapbox'; description: string;
};
export type Metrics = {
  distanceMeters: number; movingSeconds: number; stoppedSeconds: number;
  nightSeconds: number; maxSpeed: number; currentSpeed: number | null;
  lastPoint: TrackPoint | null; motion: 'moving' | 'stopped' | null;
  candidate: 'moving' | 'stopped' | null; candidateSince: number;
};
export type ReviewChoice = { status: ModuleStatus; expectedUpdatedAt: string | null };
export type PracticeSession = {
  id: string; account_id: string; learner_id: string; learner_name: string;
  started_at: number; ended_at: number | null; status: 'active' | 'finished';
  route: PracticeRoute; checks: string[]; checks_version: string;
  metrics: Metrics; interrupted: boolean; tracking_error: string | null;
  matched_until: number; detection_error: string | null;
  review: Partial<Record<ModuleId, ReviewChoice>>;
  reviewed_at: number | null; review_conflicts: string[];
};
export type StoredSession = {
  session: PracticeSession; revision: number; dirty: boolean; deleted: boolean;
  syncError: string | null;
};
export const durationOptions = Array.from({ length: 48 }, (_, i) => {
  const minutes = (i + 1) * 15;
  const hours = Math.floor(minutes / 60);
  return { value: String(minutes), label: hours
    ? String(hours) + (hours === 1 ? ' hour' : ' hours') + (minutes % 60 ? ' ' + minutes % 60 + ' min' : '')
    : String(minutes) + ' minutes' };
});
export function validDuration(value: number): boolean {
  return Number.isInteger(value) && value >= 15 && value <= 720 && value % 15 === 0;
}
export function emptyMetrics(): Metrics {
  return { distanceMeters: 0, movingSeconds: 0, stoppedSeconds: 0, nightSeconds: 0,
    maxSpeed: 0, currentSpeed: null, lastPoint: null, motion: null, candidate: null, candidateSince: 0 };
}
export function distance(a: Coordinate, b: Coordinate): number {
  const rad = Math.PI / 180;
  const lat = (b.latitude - a.latitude) * rad;
  const lon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(lat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(lon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function validPoint(p: TrackPoint): boolean {
  return Number.isFinite(p.timestamp) && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
    && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180
    && p.accuracy !== null && Number.isFinite(p.accuracy) && p.accuracy >= 0 && p.accuracy <= 50;
}

// Approximate solar elevation; used only to estimate sunset-to-sunrise recorded time.
export function isNight(p: Coordinate, timestamp: number): boolean {
  const date = new Date(timestamp);
  const day = (timestamp - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000 + 1;
  const rad = Math.PI / 180;
  const gamma = 2 * Math.PI / 365 * (day - 1);
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const hour = ((minutes + eq + 4 * p.longitude) / 4 - 180) * rad;
  const elevation = Math.asin(Math.sin(p.latitude * rad) * Math.sin(decl)
    + Math.cos(p.latitude * rad) * Math.cos(decl) * Math.cos(hour)) / rad;
  return elevation < -0.833;
}

export function addPoints(session: PracticeSession, input: TrackPoint[]): { session: PracticeSession; points: TrackPoint[]; events: PracticeEvent[] } {
  if (session.status !== 'active') return { session, points: [], events: [] };
  const metrics = { ...session.metrics };
  const points: TrackPoint[] = [];
  const events: PracticeEvent[] = [];
  for (const point of [...input].sort((a, b) => a.timestamp - b.timestamp)) {
    if (!validPoint(point) || point.timestamp < session.started_at || point.timestamp <= (metrics.lastPoint?.timestamp ?? 0)) continue;
    const previous = metrics.lastPoint;
    const dt = previous ? (point.timestamp - previous.timestamp) / 1000 : 0;
    const meters = previous ? distance(previous, point) : 0;
    // Reject impossible jumps without contaminating subsequent distance or speed.
    if (previous && dt <= 30 && meters / dt > 75) continue;
    const reported = point.speed !== null && Number.isFinite(point.speed) && point.speed >= 0 && point.speed <= 75 ? point.speed : null;
    const speed = reported ?? (previous && dt > 0 && dt <= 30 ? meters / dt : null);
    const motion = speed === null ? null : speed >= 1.4 ? 'moving' : speed <= 0.6 ? 'stopped' : metrics.motion;
    if (!previous || dt > 30) {
      metrics.motion = null; metrics.candidate = null;
    } else if (speed !== null && motion) {
      if (motion === 'moving') {
        metrics.movingSeconds += dt;
        metrics.distanceMeters += meters;
      } else metrics.stoppedSeconds += dt;
      if (isNight(point, point.timestamp - dt * 500)) metrics.nightSeconds += dt;
    }
    if (motion && motion !== metrics.motion) {
      if (metrics.candidate !== motion) {
        metrics.candidate = motion; metrics.candidateSince = point.timestamp;
      } else if (point.timestamp - metrics.candidateSince >= 5000) {
        // An initial stationary fix is not a stop. Initial sustained movement is a start.
        if (metrics.motion !== null || motion === 'moving') {
          const kind = motion === 'moving' ? 'start' : 'stop';
          events.push({ id: session.id + ':' + kind + ':' + point.timestamp, kind, timestamp: point.timestamp,
            latitude: point.latitude, longitude: point.longitude, confidence: 0.85, source: 'gps',
            description: motion === 'moving' ? 'Moving off detected' : 'Stop detected' });
        }
        metrics.motion = motion; metrics.candidate = null;
      }
    } else { metrics.candidate = null; }
    metrics.currentSpeed = speed;
    if (speed !== null) metrics.maxSpeed = Math.max(metrics.maxSpeed, speed);
    metrics.lastPoint = point;
    points.push(point);
  }
  return { session: { ...session, metrics, tracking_error: points.length ? null : session.tracking_error }, points, events };
}
export function elapsedSeconds(session: PracticeSession, now = Date.now()): number {
  return Math.max(0, ((session.ended_at ?? now) - session.started_at) / 1000);
}
export function gapSeconds(session: PracticeSession, now = Date.now()): number {
  return Math.max(0, elapsedSeconds(session, now) - session.metrics.movingSeconds - session.metrics.stoppedSeconds);
}
export function formatDuration(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  return [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60].map(n => String(n).padStart(2, '0')).join(':');
}
export function eventCounts(events: PracticeEvent[]): Record<EventKind, number> {
  const counts = { start: 0, stop: 0, left_turn: 0, right_turn: 0, roundabout: 0, merge: 0 };
  for (const event of events) counts[event.kind]++;
  return counts;
}
export const eventModules: Record<EventKind, ModuleId> = {
  start: 'car_control', stop: 'car_control', left_turn: 'turns', right_turn: 'turns', roundabout: 'roundabouts', merge: 'merging',
};
export function appleMapsUrl(route: PracticeRoute): string {
  if (route.mode === 'destination') return 'https://maps.apple.com/';
  const coordinate = (p: Coordinate) => String(p.latitude) + ',' + p.longitude;
  const params = new URLSearchParams({ source: coordinate(route.origin), destination: coordinate(route.origin), mode: 'driving' });
  for (const stop of route.stops) params.append('waypoint', coordinate(stop));
  return 'https://maps.apple.com/directions?' + params.toString();
}

// Preserve outages as breaks in a trace and keep native map rendering bounded for long drives.
export function previewSegments(points: (Coordinate & { timestamp?: number })[], recorded: boolean): Coordinate[][] {
  const segments: Coordinate[][] = [];
  const stride = Math.max(1, Math.ceil(points.length / 1500));
  let segment: Coordinate[] = [];
  for (let i = 0; i < points.length; i++) {
    if (recorded && i > 0 && (points[i].timestamp ?? 0) - (points[i - 1].timestamp ?? 0) > 30000) {
      if (segment.at(-1) !== points[i - 1]) segment.push(points[i - 1]);
      if (segment.length) segments.push(segment);
      segment = [];
    }
    if (!segment.length || i % stride === 0 || i === points.length - 1) segment.push(points[i]);
  }
  if (segment.length) segments.push(segment);
  return segments;
}
