import { getEntries, getStats } from "@/lib/queries";

export async function GET() {
  const { stats } = getStats();
  const head = [
    "date", "day", "weight_kg", "weight_used", "intake_kcal", "protein_g", "steps", "watch_kcal", "watch_kcal_counted",
    "bmr", "base_burn", "total_burn", "deficit", "cum_deficit", "est_fat_kg", "goal_path_kg", "water_l", "sleep_h", "foods",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const r = (n: number) => Math.round(n);
  const lines = [head.join(",")];
  for (const s of stats) {
    const foods = getEntries(s.date)
      .map((e) => `${e.meal}: ${e.items.map((i) => `${i.qty} ${i.name} (${r(i.kcal)})`).join(" + ")}`)
      .join(" | ");
    lines.push(
      [
        s.date, s.dayNo, s.weight, s.weightUsed, r(s.intake), r(s.protein), s.steps, s.activeKcal, r(s.activeCounted), r(s.bmr),
        r(s.baseBurn), r(s.totalBurn), r(s.deficit), r(s.cumDeficit), s.fatKg.toFixed(2),
        s.goalPath?.toFixed(2), s.water, s.sleep, foods,
      ].map(esc).join(","),
    );
  }
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="health-buddy-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
