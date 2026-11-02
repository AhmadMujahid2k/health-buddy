import { Flame } from "lucide-react";
import { fmt, KCAL_PER_KG_FAT } from "@/lib/calc";
import type { RealBurn } from "@/lib/tdee";
import { Stat } from "./ui";

const short = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Real burn (from intake + trend weight) next to the formula's guess, and what the difference means. */
export function RealBurnCard({ data }: { data: RealBurn }) {
  const { now, weeks, early } = data;
  const gap = now.burn - now.formula;
  const deficit = now.burn - now.avgIntake;
  const verdict =
    Math.abs(gap) < 150
      ? { tone: "text-good", text: `The formula is within ${fmt(Math.abs(gap))} kcal of your real burn, so the deficits on this dashboard are real.` }
      : gap < 0
        ? { tone: "text-bad", text: `You burn ~${fmt(-gap)} kcal/day less than the formula says, so your real deficit is smaller. Eat ~${fmt(Math.round(-gap / 50) * 50)} less or add steps to stay on pace.` }
        : { tone: "text-warn", text: `Your weight dropped faster than your logs explain (~${fmt(gap)} kcal/day). Usually that's water loss or food counted high; it settles as more weeks come in.` };

  return (
    <section className="card">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold"><Flame size={16} className="text-brand" /> Your real burn</h2>
        {early && <span className="chip bg-warn-soft text-warn">early estimate</span>}
      </div>
      <p className="mb-4 text-xs text-muted">
        From what you ate and how your smoothed weight moved in the {now.days} days to {short(now.end)} · {now.loggedDays}/{now.days} days logged
      </p>
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-card-2 p-3 text-center sm:grid-cols-4">
        <Stat label="Real burn" value={`${fmt(now.burn)} kcal`} sub="per day" />
        <Stat label="Formula says" value={`${fmt(now.formula)} kcal`} sub={`${gap > 0 ? "−" : "+"}${fmt(Math.abs(gap))} vs real`} />
        <Stat label="You ate" value={`${fmt(now.avgIntake)} kcal`} sub="average per day" />
        <Stat label="Real deficit" value={`${fmt(deficit)} kcal`} sub={`≈ ${fmt((deficit * 7) / KCAL_PER_KG_FAT, 2)} kg/week`} tone={deficit > 0 ? "good" : "bad"} />
      </div>
      <p className={`mt-3 text-sm ${verdict.tone}`}>{verdict.text}</p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <span>Smoothed weight {fmt(now.trendFrom, 2)} → <b className="text-foreground">{fmt(now.trendTo, 2)} kg</b></span>
        {weeks.map((w) => (
          <span key={w.end}>week to {short(w.end)}: <b className="text-foreground">{fmt(w.burn)}</b> (formula {fmt(w.formula)})</span>
        ))}
      </div>
      {early && (
        <p className="mt-2 text-xs text-muted">
          Under 4 weeks of data, the first days&apos; water and glycogen loss make the real burn read high. It gets more accurate every week.
        </p>
      )}
    </section>
  );
}
