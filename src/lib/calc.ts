import type { DayRow, DayStats, Profile } from "./types";

export const KCAL_PER_KG_FAT = 7700;

export function ageOn(dob: string, date: string): number {
  const [by, bm, bd] = dob.split("-").map(Number);
  const [y, m, d] = date.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/** Mifflin-St Jeor */
export function bmr(p: Profile, weight: number, date: string): number {
  return 10 * weight + 6.25 * p.height_cm - 5 * ageOn(p.dob, date) + (p.sex === "male" ? 5 : -161);
}

export function bmi(p: Profile, weight: number): number {
  const m = p.height_cm / 100;
  return weight / (m * m);
}

export function bmiCategory(v: number): string {
  if (v < 18.5) return "Underweight";
  if (v < 25) return "Healthy";
  if (v < 30) return "Overweight";
  if (v < 35) return "Obese I";
  if (v < 40) return "Obese II";
  return "Obese III";
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

export function addDays(date: string, n: number): string {
  const t = new Date(Date.parse(date + "T00:00:00Z") + n * 86_400_000);
  return t.toISOString().slice(0, 10);
}

/** Today's date in the server's local timezone. */
export function today(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

export type Milestone = { label: string | null; weight: number; date: string; fromWeight: number; fromDate: string };

/** The milestone that applies on `date`: the first one until its date passes, then the next one (if set). */
export function activeMilestone(p: Profile, date: string): Milestone | null {
  if (p.milestone_weight == null || !p.milestone_date) return null;
  const first: Milestone = {
    label: p.milestone_label, weight: p.milestone_weight, date: p.milestone_date,
    fromWeight: p.start_weight, fromDate: p.start_date,
  };
  if (date <= p.milestone_date || p.next_milestone_weight == null || !p.next_milestone_date) return first;
  return {
    label: p.next_milestone_label, weight: p.next_milestone_weight, date: p.next_milestone_date,
    fromWeight: p.milestone_weight, fromDate: p.milestone_date,
  };
}

/** The upcoming milestone after the active one, if any. */
export function nextMilestone(p: Profile, date: string): Milestone | null {
  const a = activeMilestone(p, date);
  if (!a || a.date !== p.milestone_date || p.next_milestone_weight == null || !p.next_milestone_date) return null;
  return activeMilestone(p, addDays(p.milestone_date, 1));
}

/** Planned weight on `date`: a straight line from the start to each milestone in turn. */
export function goalPathOn(p: Profile, date: string): number | null {
  const m = activeMilestone(p, date);
  if (!m) return null;
  const total = daysBetween(m.fromDate, m.date);
  if (total <= 0) return null;
  const t = Math.min(Math.max(daysBetween(m.fromDate, date), 0), total);
  return m.fromWeight - ((m.fromWeight - m.weight) * t) / total;
}

/**
 * Watch kcal are for ALL steps, but BMR x activity factor already includes everyday movement
 * (~base_steps). Count only the share of watch kcal from steps above that baseline.
 * Without a step count we assume the kcal are workout-only and count them in full.
 */
export function countedActiveKcal(watchKcal: number, steps: number | null, baseSteps: number): number {
  if (!watchKcal) return 0;
  if (!steps) return watchKcal;
  return (watchKcal * Math.max(0, steps - baseSteps)) / steps;
}

/**
 * Build per-day stats from the start date to `until`.
 * Days with no food logged get deficit 0, so a half-finished day can't inflate progress.
 */
export function buildStats(
  p: Profile,
  days: DayRow[],
  food: Map<string, { kcal: number; protein: number }>,
  until: string,
): DayStats[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const out: DayStats[] = [];
  let weightUsed = p.start_weight;
  let cum = 0;
  const n = daysBetween(p.start_date, until);
  for (let i = 0; i <= n; i++) {
    const date = addDays(p.start_date, i);
    const row = byDate.get(date);
    const f = food.get(date);
    if (row?.weight != null) weightUsed = row.weight;
    const intake = f?.kcal ?? 0;
    const active = row?.active_kcal ?? 0;
    const counted = countedActiveKcal(active, row?.steps ?? null, p.base_steps ?? 3000);
    const b = bmr(p, weightUsed, date);
    const base = b * p.activity_factor;
    const total = base + counted;
    const deficit = intake > 0 ? total - intake : 0;
    cum += deficit;
    out.push({
      date,
      dayNo: i + 1,
      weight: row?.weight ?? null,
      weightUsed,
      intake,
      protein: f?.protein ?? 0,
      steps: row?.steps ?? null,
      activeKcal: active,
      activeCounted: counted,
      bmr: b,
      baseBurn: base,
      totalBurn: total,
      deficit,
      cumDeficit: cum,
      fatKg: cum / KCAL_PER_KG_FAT,
      goalPath: goalPathOn(p, date),
      water: row?.water_l ?? null,
      sleep: row?.sleep_h ?? null,
      logged: intake > 0,
    });
  }
  return out;
}

export type GoalStatus = "GOAL REACHED" | "ON TRACK" | "SLIGHTLY BEHIND" | "BEHIND";

export function goalStatus(current: number, planned: number | null, target: number | null): GoalStatus | null {
  if (planned == null || target == null) return null;
  if (current <= target) return "GOAL REACHED";
  if (current <= planned + 0.3) return "ON TRACK";
  if (current <= planned + 1.5) return "SLIGHTLY BEHIND";
  return "BEHIND";
}

export const fmt = (n: number, d = 0) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
