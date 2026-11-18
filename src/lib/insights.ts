import { addDays, fmt, goalPathOn, KCAL_PER_KG_FAT } from "./calc";
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
    // today can extend a streak but not break it: it isn't over yet
    else if (s.date !== today) run = 0;
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

export type JourneyStop = { name: string; km: number };
export type Journey = { name: string; stops: JourneyStop[] };

/**
 * Routes walked one after another with your total distance. When the last one is finished the series starts again
 * (round 2). Edit or add routes here; `km` is the road distance from the route's start, and the last stop is the end.
 */
export const JOURNEYS: Journey[] = [
  {
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
  },
  {
    name: "Islamabad → Khunjerab Pass (KKH)",
    stops: [
      { name: "Islamabad", km: 0 },
      { name: "Abbottabad", km: 120 },
      { name: "Besham", km: 275 },
      { name: "Chilas", km: 475 },
      { name: "Gilgit", km: 605 },
      { name: "Hunza", km: 705 },
      { name: "Sost", km: 790 },
      { name: "Khunjerab", km: 875 },
    ],
  },
];

const legKm = (j: Journey) => j.stops.at(-1)!.km;

export interface FinishedJourney {
  name: string;
  km: number;
  start: string;
  end: string;
}

export interface JourneyState {
  journey: Journey;
  round: number; // 1 the first time through the series
  pos: number; // km along the current journey
  finished: FinishedJourney[]; // oldest first
  /** The journey finished today or yesterday, to celebrate on the dashboard. */
  justArrived: FinishedJourney | null;
}

/** Where the total distance up to `today` puts you in the series, and which journeys you finished on which day. */
export function journeyState(stats: DayStats[], today: string): JourneyState {
  const days = stats.filter((s) => s.date <= today);
  const finished: FinishedJourney[] = [];
  let i = 0; // index into the series, counting repeats
  let done = 0; // km covered by finished journeys
  let legStart = days[0]?.date ?? today;
  let total = 0;
  for (const d of days) {
    total += d.km ?? 0;
    // one big day could finish more than one journey
    while (total >= done + legKm(JOURNEYS[i % JOURNEYS.length])) {
      const j = JOURNEYS[i % JOURNEYS.length];
      done += legKm(j);
      finished.push({ name: j.name, km: legKm(j), start: legStart, end: d.date });
      legStart = d.date;
      i++;
    }
  }
  const last = finished.at(-1);
  return {
    journey: JOURNEYS[i % JOURNEYS.length],
    round: Math.floor(i / JOURNEYS.length) + 1,
    pos: total - done,
    finished,
    justArrived: last && last.end >= addDays(today, -1) ? last : null,
  };
}

// ── Rotating insights ──────────────────────────────────────────────────

const shortDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function getInsights(p: Profile, stats: DayStats[], today: string): string[] {
  const out: string[] = [];
  const past = stats.filter((s) => s.date <= today);
  const logged = past.filter((s) => s.logged && !s.partial);
  const weighIns = past.filter((s) => s.weight != null);
  const last = weighIns.at(-1);
  const totalKm = past.reduce((a, s) => a + (s.km ?? 0), 0);
  const totalSteps = past.reduce((a, s) => a + (s.steps ?? 0), 0);
  const cum = past.at(-1)?.cumDeficit ?? 0; // excludes today, which is still being logged
  const fatKg = cum / KCAL_PER_KG_FAT;

  if (last) {
    const lost = p.start_weight - last.weight!;
    const ahead = last.goalPath != null ? last.goalPath - last.weight! : null;
    out.push(
      `⚖️ ${fmt(lost, 1)} kg down since ${shortDate(p.start_date)}` +
        (ahead != null ? ` · ${fmt(Math.abs(ahead), 1)} kg ${ahead >= 0 ? "ahead of" : "behind"} plan` : ""),
    );

    // when the plan line crosses the next whole kilo below the current weight
    const nextKg = Math.floor(last.weight! - 1e-9);
    let planDay: string | null = null;
    for (let i = 1; i <= 400; i++) {
      const d = addDays(today, i);
      const g = goalPathOn(p, d);
      if (g == null) break;
      if (g < nextKg) { planDay = d; break; }
    }
    out.push(`🎯 Next stop: under ${nextKg} kg${planDay ? ` · the plan gets there on ${shortDate(planDay)}` : ""}`);
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
