import { fmt, KCAL_PER_KG_FAT } from "./calc";
import type { DayStats, Profile } from "./types";

// ── Streaks ────────────────────────────────────────────────────────────

export interface Streak {
  key: string;
  label: string;
  emoji: string;
  current: number;
  best: number;
}

/**
 * Consecutive days (ending today, or yesterday if today doesn't count yet) that pass `ok`.
 * `ready` says whether a day has the data to be judged; today without data doesn't break the streak.
 */
function streak(stats: DayStats[], today: string, ok: (s: DayStats) => boolean, ready: (s: DayStats) => boolean) {
  let best = 0;
  let run = 0;
  for (const s of stats) {
    if (s.date > today) break;
    if (ready(s) && ok(s)) best = Math.max(best, ++run);
    else if (s.date !== today || ready(s)) run = 0;
  }
  // `run` now ends at today (or yesterday when today isn't judged yet)
  return { current: run, best };
}

export function getStreaks(p: Profile, stats: DayStats[], today: string): Streak[] {
  const logged = (s: DayStats) => s.logged;
  const hasSteps = (s: DayStats) => s.steps != null;
  return [
    { key: "deficit", label: "Days in a deficit", emoji: "🔥", ...streak(stats, today, (s) => s.deficit > 0, logged) },
    { key: "target", label: `Within ${fmt(p.kcal_target)} kcal`, emoji: "🎯", ...streak(stats, today, (s) => s.intake <= p.kcal_target, logged) },
    { key: "protein", label: `${p.protein_target} g+ protein`, emoji: "🥩", ...streak(stats, today, (s) => s.protein >= p.protein_target, logged) },
    { key: "steps", label: `${fmt(p.step_target)}+ steps`, emoji: "👟", ...streak(stats, today, (s) => (s.steps ?? 0) >= p.step_target, hasSteps) },
  ];
}

// ── Walking journey ────────────────────────────────────────────────────

/** A route to "walk" with your total distance. Edit the stops to use your own route. */
export const JOURNEY = {
  name: "Lahore → Islamabad (M-2)",
  stops: [
    { name: "Lahore", km: 0 },
    { name: "Sheikhupura", km: 35 },
    { name: "Pindi Bhattian", km: 110 },
    { name: "Bhera", km: 190 },
    { name: "Kallar Kahar", km: 245 },
    { name: "Chakri", km: 330 },
    { name: "Islamabad", km: 375 },
  ],
};

export function journeyProgress(totalKm: number) {
  const length = JOURNEY.stops.at(-1)!.km;
  const lap = Math.floor(totalKm / length);
  const pos = totalKm - lap * length;
  const next = JOURNEY.stops.find((s) => s.km > pos) ?? JOURNEY.stops.at(-1)!;
  const passed = [...JOURNEY.stops].reverse().find((s) => s.km <= pos) ?? JOURNEY.stops[0];
  return { length, lap, pos, next, passed, toNext: next.km - pos };
}

// ── Rotating insights ──────────────────────────────────────────────────

const shortDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function getInsights(p: Profile, stats: DayStats[], today: string): string[] {
  const out: string[] = [];
  const past = stats.filter((s) => s.date <= today);
  const logged = past.filter((s) => s.logged);
  const weighIns = past.filter((s) => s.weight != null);
  const last = weighIns.at(-1);
  const totalKm = past.reduce((a, s) => a + (s.km ?? 0), 0);
  const totalSteps = past.reduce((a, s) => a + (s.steps ?? 0), 0);
  const cum = past.at(-1)?.cumDeficit ?? 0;
  const fatKg = cum / KCAL_PER_KG_FAT;

  if (last) {
    const lost = p.start_weight - last.weight!;
    const ahead = last.goalPath != null ? last.goalPath - last.weight! : null;
    out.push(
      `⚖️ ${fmt(lost, 1)} kg down since ${shortDate(p.start_date)}` +
        (ahead != null ? ` · ${fmt(Math.abs(ahead), 1)} kg ${ahead >= 0 ? "ahead of" : "behind"} plan` : ""),
    );

    // when the plan line crosses the next whole kilo below the current weight
    const nextKg = Math.ceil(last.weight!) - 1;
    const planDay = stats.find((s) => s.goalPath != null && s.goalPath < nextKg && s.date > today);
    out.push(`🎯 Next stop: under ${nextKg} kg${planDay ? ` · the plan gets there on ${shortDate(planDay.date)}` : ""}`);
  }
  if (fatKg > 0.1) out.push(`🧈 ${fmt(fatKg, 2)} kg of fat burned, about ${fmt(fatKg, 1)} packs of 1 kg ghee`);
  if (cum > 0) out.push(`🍛 ${fmt(cum)} kcal total deficit, like skipping ${fmt(cum / 600)} plates of biryani`);
  if (totalKm > 1) {
    const marathons = totalKm / 42.2;
    out.push(`🚶 ${fmt(totalKm, 1)} km walked so far${marathons >= 1 ? `, that's ${fmt(marathons, 1)} marathons` : ""}`);
  }
  if (totalSteps > 0) out.push(`👣 ${fmt(totalSteps)} steps since day 1`);
  if (logged.length) {
    const best = logged.reduce((a, s) => (s.deficit > a.deficit ? s : a));
    out.push(`🏆 Best day: ${shortDate(best.date)}, ${fmt(best.deficit)} kcal deficit`);
    const inDeficit = logged.filter((s) => s.deficit > 0).length;
    out.push(`✅ ${inDeficit} of ${logged.length} logged days in a calorie deficit`);
    const recent = logged.slice(-7);
    const prot = recent.reduce((a, s) => a + s.protein, 0) / recent.length;
    out.push(`🥩 Protein, last 7 days: ${fmt(prot)} g a day (target ${p.protein_target} g)`);
  }
  return out;
}
