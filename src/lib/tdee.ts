import { addDays, daysBetween, KCAL_PER_KG_FAT } from "./calc";
import type { DayStats } from "./types";

/**
 * "Real burn" (adaptive TDEE): what you actually burn, worked back from what you ate and how your weight moved.
 *   burn ≈ average intake + (trend weight lost × 7,700) / days
 * Weight is smoothed first (exponential moving average) so salt/water swings don't throw it off.
 */

const ALPHA = 0.1; // smoothing: each weigh-in moves the trend 10% of the way
export const WINDOW = 21;

/** Smoothed weight for every day (carried forward on days without a weigh-in). */
export function trendWeights(stats: DayStats[]): Map<string, number> {
  const out = new Map<string, number>();
  let t: number | null = null;
  for (const s of stats) {
    if (s.weight != null) t = t == null ? s.weight : t + ALPHA * (s.weight - t);
    if (t != null) out.set(s.date, t);
  }
  return out;
}

export type BurnEstimate = {
  end: string;
  days: number;
  loggedDays: number;
  avgIntake: number;
  trendFrom: number;
  trendTo: number;
  /** real burn, kcal/day */
  burn: number;
  /** the formula's average burn over the same days (BMR × factor + counted watch kcal) */
  formula: number;
};

function estimate(stats: DayStats[], trend: Map<string, number>, end: string, window: number): BurnEstimate | null {
  const start = addDays(end, -window);
  const from = trend.get(start);
  const to = trend.get(end);
  const span = stats.filter((s) => s.date > start && s.date <= end);
  const logged = span.filter((s) => s.logged);
  // need most days logged, or the intake average means little
  if (from == null || to == null || logged.length < window * 0.7) return null;
  const avgIntake = logged.reduce((a, s) => a + s.intake, 0) / logged.length;
  return {
    end,
    days: window,
    loggedDays: logged.length,
    avgIntake,
    trendFrom: from,
    trendTo: to,
    burn: avgIntake + ((from - to) * KCAL_PER_KG_FAT) / window,
    formula: span.reduce((a, s) => a + s.totalBurn, 0) / span.length,
  };
}

export type RealBurn = {
  now: BurnEstimate;
  /** the same estimate at the end of each earlier week, oldest first */
  weeks: BurnEstimate[];
  /** fewer than 4 weeks of data: the first weeks include water/glycogen loss, so it reads high */
  early: boolean;
};

/** Uses the last full day (yesterday) so a half-logged today doesn't drag the intake average down. */
export function realBurn(stats: DayStats[], t: string): RealBurn | null {
  const past = stats.filter((s) => s.date < t);
  if (!past.length) return null;
  const end = past.at(-1)!.date;
  const trend = trendWeights(past);
  const window = Math.min(WINDOW, daysBetween(past[0].date, end));
  if (window < 14) return null;
  const now = estimate(past, trend, end, window);
  if (!now) return null;
  const weeks: BurnEstimate[] = [];
  for (let e = addDays(end, -7); daysBetween(past[0].date, e) >= 14; e = addDays(e, -7)) {
    const w = estimate(past, trend, e, Math.min(WINDOW, daysBetween(past[0].date, e)));
    if (w) weeks.unshift(w);
  }
  return { now, weeks: weeks.slice(-3), early: daysBetween(past[0].date, end) < 28 };
}
