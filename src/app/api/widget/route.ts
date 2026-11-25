import { connection } from "next/server";
import { getEntries, getStats } from "@/lib/queries";
import { activeMilestone, daysBetween, goalPathOn, today } from "@/lib/calc";

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Today at a glance, for phone widgets: calories eaten and left, protein, steps, latest weight and the current
 * milestone, plus today's meals and the last 7 days for the large widget. Read-only. The Drive sync script saves this after every log so a widget can read it from anywhere.
 */
export async function GET() {
  await connection(); // always live: today's numbers change with every log
  const t = today();
  const { profile: p, stats } = getStats(t);
  const day = stats.find((s) => s.date === t);
  const last = stats.filter((s) => s.weight != null).at(-1);
  const weight = last?.weight ?? p.start_weight;
  const m = activeMilestone(p, t);
  const plan = goalPathOn(p, t);
  const eaten = Math.round(day?.intake ?? 0);

  // today's calories per meal
  const meals: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, drink: 0 };
  for (const e of getEntries(t)) meals[e.meal] = (meals[e.meal] ?? 0) + e.items.reduce((a, i) => a + i.kcal, 0);
  for (const k in meals) meals[k] = Math.round(meals[k]);

  // the last 7 finished days
  const past = stats.filter((s) => s.date < t);
  const week = past.filter((s) => s.logged).slice(-7);

  return Response.json({
    date: t,
    updatedAt: new Date().toISOString(),
    kcal: { eaten, target: p.kcal_target, floor: p.kcal_floor, left: p.kcal_target - eaten },
    protein: { eaten: Math.round(day?.protein ?? 0), target: p.protein_target },
    steps: { count: day?.steps ?? null, target: p.step_target },
    burn: day ? Math.round(day.totalBurn) : null,
    meals,
    week: week.map((s) => ({ date: s.date, kcal: Math.round(s.intake) })),
    deficitAvg7: week.length ? Math.round(week.reduce((a, s) => a + s.deficit, 0) / week.length) : null,
    fatKg: round1(past.at(-1)?.fatKg ?? 0), // finished days only, like the dashboard
    weight: { kg: weight, date: last?.date ?? p.start_date, start: p.start_weight },
    goal: m && {
      label: m.label,
      weight: m.weight,
      date: m.date,
      from: m.fromWeight,
      kgLeft: round1(Math.max(0, weight - m.weight)),
      daysLeft: Math.max(0, daysBetween(t, m.date)),
      ahead: plan != null ? round1(plan - weight) : null,
    },
  });
}
