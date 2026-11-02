import { addDays, daysBetween } from "./calc";
import { prayerTimes } from "./prayer";
import type { DayStats, Profile } from "./types";

/** Weeks after Eid to watch for regain: most Ramadan weight loss comes back within 2–5 weeks. */
export const GUARD_DAYS = 28;
/** How far ahead the dashboard starts counting down. */
export const LEAD_DAYS = 30;

export type RamadanPhase =
  | { kind: "upcoming"; daysUntil: number }
  | { kind: "fasting"; day: number; of: number }
  | { kind: "guard"; daysSinceEid: number }
  | null;

export function ramadanPhase(p: Profile, t: string): RamadanPhase {
  const { ramadan_start: start, ramadan_end: end } = p;
  if (!start || !end || end < start) return null;
  if (t < start) {
    const n = daysBetween(t, start);
    return n <= LEAD_DAYS ? { kind: "upcoming", daysUntil: n } : null;
  }
  if (t <= end) return { kind: "fasting", day: daysBetween(start, t) + 1, of: daysBetween(start, end) + 1 };
  const since = daysBetween(end, t);
  return since <= GUARD_DAYS ? { kind: "guard", daysSinceEid: since } : null;
}

export type FastDay = { date: string; day: number; sehriEnds: number; iftar: number; isha: number; fastMin: number };

/** Sehri ends at Fajr, iftar is Maghrib; minutes after midnight. */
export function fastDay(p: Profile, date: string, day = 0): FastDay {
  const pt = prayerTimes(date, p.latitude, p.longitude, p.utc_offset);
  return { date, day, sehriEnds: pt.fajr, iftar: pt.maghrib, isha: pt.isha, fastMin: pt.maghrib - pt.fajr };
}

export function timetable(p: Profile): FastDay[] {
  if (!p.ramadan_start || !p.ramadan_end) return [];
  const n = daysBetween(p.ramadan_start, p.ramadan_end);
  return Array.from({ length: n + 1 }, (_, i) => fastDay(p, addDays(p.ramadan_start!, i), i + 1));
}

/** How the day's calories and protein split between the three meals of a fasting day. */
export const MEAL_SPLIT = [
  {
    meal: "Iftar",
    share: 0.4,
    protein: 0.35,
    tips: ["Open with 1–2 dates and 2 glasses of water", "Then a real plate: chicken/daal + 1 roti + salad", "Pakoras and samosas: 1 piece, not a plate"],
  },
  {
    meal: "After Taraweeh",
    share: 0.15,
    protein: 0.2,
    tips: ["Fruit, yogurt or a glass of milk", "Keep drinking water, a glass every hour", "No cold drinks or sweet sherbet"],
  },
  {
    meal: "Sehri",
    share: 0.45,
    protein: 0.45,
    tips: ["Eggs + roti or oats keep you full longest", "Yogurt or milk, and 2 glasses of water", "Skip paratha and very salty food: they make you thirsty"],
  },
] as const;

/** Latest weigh-in on or before `date`. */
const weightOn = (stats: DayStats[], date: string) => stats.filter((s) => s.date <= date && s.weight != null).at(-1)?.weight ?? null;

/** Weight at the start of Ramadan, at Eid, and now, for the regain guard. */
export function ramadanWeights(p: Profile, stats: DayStats[], t: string) {
  if (!p.ramadan_start || !p.ramadan_end) return null;
  return {
    before: weightOn(stats, addDays(p.ramadan_start, -1)) ?? weightOn(stats, p.ramadan_start),
    eid: weightOn(stats, p.ramadan_end),
    now: weightOn(stats, t),
  };
}
