import { connection } from "next/server";
import { getStats } from "@/lib/queries";
import { activeMilestone, daysBetween, fmt, goalStatus, today } from "@/lib/calc";

/** Small milestone card at the bottom of the sidebar. */
export async function GoalWidget() {
  await connection();
  const { profile: p, stats } = getStats();
  const m = activeMilestone(p, today());
  if (!m) return null;
  const last = stats.filter((s) => s.weight != null).at(-1);
  const current = last?.weight ?? p.start_weight;
  const status = goalStatus(current, last?.goalPath ?? null, m.weight);
  const total = m.fromWeight - m.weight;
  const pct = total > 0 ? Math.min(100, Math.max(0, ((m.fromWeight - current) / total) * 100)) : 0;
  const daysLeft = Math.max(0, daysBetween(today(), m.date));
  const good = status === "ON TRACK" || status === "GOAL REACHED";
  return (
    <div className="rounded-xl border border-sidebar-line bg-sidebar-line/40 p-3.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-sidebar-strong">🎯 {fmt(m.weight)} kg goal</span>
        <span className={good ? "text-sidebar-accent" : "text-amber-300"}>{status === "ON TRACK" ? "On track" : status?.toLowerCase()}</span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sidebar">
        <div className="h-full rounded-full bg-sidebar-accent" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px]">
        <span>{fmt(current, 2)} kg now</span>
        <span>{daysLeft} days left</span>
      </div>
    </div>
  );
}
