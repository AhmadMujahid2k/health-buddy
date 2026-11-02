import { addDays, daysBetween, KCAL_PER_KG_FAT } from "./calc";
import type { DayStats, EventKind, EventRow } from "./types";

export const KINDS: { key: EventKind; label: string; emoji: string }[] = [
  { key: "dawat", label: "Dawat", emoji: "🍛" },
  { key: "wedding", label: "Wedding", emoji: "💍" },
  { key: "restaurant", label: "Dinner out", emoji: "🍽️" },
  { key: "birthday", label: "Birthday", emoji: "🎂" },
  { key: "anniversary", label: "Anniversary", emoji: "💐" },
  { key: "other", label: "Other", emoji: "📅" },
];

export const kindOf = (k: EventKind) => KINDS.find((x) => x.key === k) ?? KINDS.at(-1)!;

/** Plate strategy shown for food-heavy events. */
export const PLATE_PLAN: Partial<Record<EventKind, string[]>> = {
  dawat: [
    "Start with salad and raita, then tikka, boti or seekh kabab",
    "1 roti or naan, or ½ plate of rice, not both",
    "Take biryani/pulao once, half a plate",
    "Water or a zero drink; one small sweet at most",
  ],
  wedding: [
    "Eat a protein snack before leaving (2 eggs) so you don't arrive starving",
    "Fill half the plate with chicken/mutton pieces and salad, skip the oily gravy",
    "One round of rice or naan, not seconds",
    "Skip cold drinks; share the dessert",
  ],
  restaurant: [
    "Order 1 protein main (grilled, steamed or stir-fried), not 2",
    "Soup instead of fried starters",
    "Plain rice or 1 roti, not fried rice or naan",
    "Zero drink or green tea",
  ],
  birthday: ["One slice of cake, eaten slowly", "Fill up on the protein dish first", "Zero drink instead of regular"],
  anniversary: ["Pick a grilled or steamed main", "Share the dessert", "Zero drink or green tea"],
};

/** The next date this event happens on or after `t` (yearly events roll to next year once passed). */
export function nextDate(e: EventRow, t: string): string {
  if (!e.yearly) return e.date;
  const md = e.date.slice(5);
  const year = Number(t.slice(0, 4));
  const thisYear = `${year}-${md}`;
  return thisYear >= t ? thisYear : `${year + 1}-${md}`;
}

/** kg per day from a least-squares fit of the last 14 days of weigh-ins; falls back to the logged deficit. */
export function weightPace(stats: DayStats[], t: string): { kgPerDay: number; from: "scale" | "deficit" } | null {
  const pts = stats.filter((s) => s.weight != null && s.date <= t && daysBetween(s.date, t) < 14);
  if (pts.length >= 5) {
    const xs = pts.map((s) => daysBetween(pts[0].date, s.date));
    const ys = pts.map((s) => s.weight!);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    if (den > 0) return { kgPerDay: xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / den, from: "scale" };
  }
  const recent = stats.filter((s) => s.logged && s.date <= t).slice(-7);
  if (!recent.length) return null;
  return { kgPerDay: -recent.reduce((a, s) => a + s.deficit, 0) / recent.length / KCAL_PER_KG_FAT, from: "deficit" };
}

export type EventPlan = {
  event: EventRow;
  date: string;
  daysLeft: number;
  /** projected weight on the day at the current pace */
  forecast: number | null;
  /** when the current pace reaches the target weight */
  reachOn: string | null;
  /** extra kcal/day to cut (positive) or room to spare (negative) to hit the target on the day */
  kcalGap: number | null;
  /** daily saving before the event, and whether today is one of those days */
  bank: { perDay: number; from: string; today: boolean } | null;
};

export function planEvents(events: EventRow[], stats: DayStats[], t: string, current: number): EventPlan[] {
  const pace = weightPace(stats, t);
  const recent = stats.filter((s) => s.logged && s.date <= t).slice(-7);
  const avgDeficit = recent.length ? recent.reduce((a, s) => a + s.deficit, 0) / recent.length : null;

  return events
    .map((event) => {
      const date = nextDate(event, t);
      const daysLeft = daysBetween(t, date);
      const forecast = pace && daysLeft >= 0 ? current + pace.kgPerDay * daysLeft : null;

      let reachOn: string | null = null;
      let kcalGap: number | null = null;
      const target = event.target_weight;
      if (target != null && current > target) {
        if (pace && pace.kgPerDay < 0) reachOn = addDays(t, Math.ceil((current - target) / -pace.kgPerDay));
        if (daysLeft > 0 && avgDeficit != null) kcalGap = ((current - target) * KCAL_PER_KG_FAT) / daysLeft - avgDeficit;
      }

      let bank: EventPlan["bank"] = null;
      if (event.extra_kcal && event.extra_kcal > 0 && daysLeft >= 0) {
        const from = addDays(date, -event.bank_days);
        bank = { perDay: Math.round(event.extra_kcal / event.bank_days / 10) * 10, from, today: t >= from && t < date };
      }
      return { event, date, daysLeft, forecast, reachOn, kcalGap, bank };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
