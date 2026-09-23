export type PracticeStats = Readonly<{
  totalMinutes: number;
  nightMinutes: number;
}>;

export const EMPTY_PRACTICE_STATS: PracticeStats = Object.freeze({ totalMinutes: 0, nightMinutes: 0 });

export const PRACTICE_REQUIREMENTS_URL =
  'https://www.vicroads.vic.gov.au/ls-and-ps/getting-your-ps/how-to-get-your-ps';

// Checked against VicRoads on 23 September 2026. Night hours are part of the total.
// The under-21 rule applies at the time of the licence application.
export function getPracticeHourTargets(age: number): { total: number; night: number } | null {
  return age >= 0 && age < 21 ? { total: 120, night: 20 } : null;
}

export function practiceStatsKey(accountId: string, learnerId: string): string {
  return `karla:practice-stats:v1:${encodeURIComponent(accountId)}:${encodeURIComponent(learnerId)}`;
}

type StatsStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

function isMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseStats(raw: string | null): PracticeStats | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const { totalMinutes, nightMinutes } = value as Partial<PracticeStats>;
    if (!isMinutes(totalMinutes) || !isMinutes(nightMinutes) || nightMinutes > totalMinutes) return null;
    return { totalMinutes, nightMinutes };
  } catch {
    return null;
  }
}

// Only an aggregate cache for now. No session records or invented practice time.
// Keep whole minutes in storage so displaying decimal hours never loses source precision.
export async function readPracticeStats(
  storage: StatsStorage,
  accountId: string,
  learnerId: string,
): Promise<PracticeStats> {
  const key = practiceStatsKey(accountId, learnerId);
  let raw: string | null;
  try {
    raw = await storage.getItem(key);
  } catch {
    // A failed read must not overwrite a potentially valid cache.
    return EMPTY_PRACTICE_STATS;
  }
  const cached = parseStats(raw);
  if (cached) return cached;
  await storage.setItem(key, JSON.stringify(EMPTY_PRACTICE_STATS)).catch(() => {});
  return EMPTY_PRACTICE_STATS;
}

export function formatPracticeHours(minutes: number): string {
  // Truncate instead of rounding up: 119h 59m must never appear to meet 120h.
  return String(Math.floor(minutes / 6) / 10);
}
