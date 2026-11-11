import type { DayStats, Profile } from "./types";

export type Week = ReturnType<typeof weekly>[number];

/** Week-by-week averages and totals since the start date (week 1 starts on the start date), newest week first. */
export function weekly(p: Profile, stats: DayStats[]) {
  const weeks: {
    week: number; start: string; end: string; avgWeight: number | null; avgIntake: number | null;
    deficit: number; days: number; avgSteps: number | null; km: number; avgProtein: number | null; onTarget: number; logged: number;
  }[] = [];
  for (const s of stats) {
    const w = Math.floor((s.dayNo - 1) / 7);
    (weeks[w] ??= {
      week: w + 1, start: s.date, end: s.date, avgWeight: null, avgIntake: null, deficit: 0, days: 0,
      avgSteps: null, km: 0, avgProtein: null, onTarget: 0, logged: 0,
    }).end = s.date;
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  for (const wk of weeks) {
    const ds = stats.filter((s) => s.date >= wk.start && s.date <= wk.end);
    // today is still being logged: leave it out of averages and totals until it's over
    const done = ds.filter((s) => !s.partial);
    const logged = done.filter((s) => s.logged);
    wk.days = ds.length;
    wk.avgWeight = avg(ds.flatMap((s) => (s.weight != null ? [s.weight] : [])));
    wk.avgIntake = avg(logged.map((s) => s.intake));
    wk.avgProtein = avg(logged.map((s) => s.protein));
    wk.avgSteps = avg(ds.flatMap((s) => (s.steps != null ? [s.steps] : [])));
    wk.km = ds.reduce((a, s) => a + (s.km ?? 0), 0);
    wk.deficit = done.reduce((a, s) => a + s.deficit, 0);
    wk.onTarget = logged.filter((s) => s.intake <= p.kcal_target).length;
    wk.logged = logged.length;
  }
  return weeks.reverse();
}
