import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getStats } from "@/lib/queries";
import { activeMilestone, bmi, bmiCategory, daysBetween, fmt, fmtKm, goalStatus, nextMilestone, today } from "@/lib/calc";
import type { DayStats, Profile } from "@/lib/types";
import { Charts } from "@/components/Charts";
import { Bar, CalorieRing, KpiCard, PageHeader, Stat } from "@/components/ui";
import { Activity, AlertTriangle, CheckCircle2, Download, Flame, Plus, Scale, TrendingDown } from "lucide-react";

export default function Home() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Loading dashboard…</p>}>
      <Dashboard />
    </Suspense>
  );
}

function weekly(p: Profile, stats: DayStats[]) {
  const weeks: {
    week: number; start: string; end: string; avgWeight: number | null; avgIntake: number | null;
    deficit: number; avgSteps: number | null; km: number; avgProtein: number | null; onTarget: number; logged: number;
  }[] = [];
  for (const s of stats) {
    const w = Math.floor((s.dayNo - 1) / 7);
    (weeks[w] ??= {
      week: w + 1, start: s.date, end: s.date, avgWeight: null, avgIntake: null, deficit: 0,
      avgSteps: null, km: 0, avgProtein: null, onTarget: 0, logged: 0,
    }).end = s.date;
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  for (const wk of weeks) {
    const ds = stats.filter((s) => s.date >= wk.start && s.date <= wk.end);
    const logged = ds.filter((s) => s.logged);
    wk.avgWeight = avg(ds.flatMap((s) => (s.weight != null ? [s.weight] : [])));
    wk.avgIntake = avg(logged.map((s) => s.intake));
    wk.avgProtein = avg(logged.map((s) => s.protein));
    wk.avgSteps = avg(ds.flatMap((s) => (s.steps != null ? [s.steps] : [])));
    wk.km = ds.reduce((a, s) => a + (s.km ?? 0), 0);
    wk.deficit = ds.reduce((a, s) => a + s.deficit, 0);
    wk.onTarget = logged.filter((s) => s.intake <= p.kcal_target).length;
    wk.logged = logged.length;
  }
  return weeks.reverse();
}

async function Dashboard() {
  await connection();
  const t = today();
  const { profile: p, stats } = getStats(t);
  const todayS = stats.find((s) => s.date === t) ?? stats.at(-1)!;
  const weighIns = stats.filter((s) => s.weight != null);
  const last = weighIns.at(-1);
  const current = last?.weight ?? p.start_weight;
  const lost = p.start_weight - current;
  const b = bmi(p, current);

  const planned = last?.goalPath ?? null;
  const m = activeMilestone(p, t);
  const nextM = nextMilestone(p, t);
  const status = goalStatus(current, planned, m?.weight ?? null);
  const daysLeft = m ? Math.max(0, daysBetween(t, m.date)) : null;
  const kgLeft = m ? Math.max(0, current - m.weight) : null;
  const pace = daysLeft && kgLeft != null ? kgLeft / (daysLeft / 7) : null;

  const recent = stats.filter((s) => s.logged).slice(-7);
  const avg = (f: (s: DayStats) => number) => (recent.length ? recent.reduce((a, s) => a + f(s), 0) / recent.length : 0);
  const totalDeficit = stats.at(-1)?.cumDeficit ?? 0;

  const goalTotal = m ? m.fromWeight - m.weight : 0;
  const goalPct = m && goalTotal > 0 ? Math.min(100, Math.max(0, ((m.fromWeight - current) / goalTotal) * 100)) : 0;
  const good = status === "ON TRACK" || status === "GOAL REACHED";
  const ahead = planned != null ? planned - current : null;

  return (
    <>
      <PageHeader
        title={`Hi ${p.name ?? "there"} 👋`}
        subtitle={`${new Date(t + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · Day ${todayS.dayNo} of your journey`}
        actions={
          <>
            <a href="/api/export" className="btn btn-ghost"><Download size={16} /> Export</a>
            <Link href="/log" className="btn"><Plus size={16} /> Log food</Link>
          </>
        }
      />

      <div className="space-y-5">
        {/* KPIs */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard icon={Scale} label="Current weight" value={`${fmt(current, 2)} kg`} sub={`${lost >= 0 ? "−" : "+"}${fmt(Math.abs(lost), 2)} kg since start`} />
          <KpiCard icon={Activity} label="BMI" value={fmt(b, 1)} sub={bmiCategory(b)} />
          <KpiCard icon={Flame} label="Est. fat lost" value={`${fmt(totalDeficit / 7700, 2)} kg`} sub={`${fmt(totalDeficit)} kcal total deficit`} tone={totalDeficit > 0 ? "good" : undefined} />
          <KpiCard icon={TrendingDown} label="Avg deficit · 7 days" value={`${fmt(avg((s) => s.deficit))} kcal`} sub={`avg intake ${fmt(avg((s) => s.intake))} kcal`} />
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {/* Today */}
          <div className="card lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Today</h2>
              <span className="text-xs text-muted">Target {fmt(p.kcal_target)} kcal · {p.protein_target} g protein</span>
            </div>
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <CalorieRing eaten={todayS.intake} target={p.kcal_target} />
              <div className="w-full flex-1 space-y-4">
                <Bar label="Calories eaten" value={todayS.intake} max={p.kcal_target} unit="kcal" overIsBad />
                <Bar label="Protein" value={todayS.protein} max={p.protein_target} unit="g" />
                <Bar label="Steps" value={todayS.steps ?? 0} max={p.step_target} unit="" note={todayS.km != null ? fmtKm(todayS.km, todayS.kmEstimated) : undefined} />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-card-2 p-3 text-center">
              <Stat label="Burned" value={fmt(todayS.totalBurn)} />
              <Stat label="Deficit" value={todayS.logged ? fmt(todayS.deficit) : "–"} tone={todayS.deficit > 0 ? "good" : undefined} />
              <Stat label="Watch kcal counted" value={fmt(todayS.activeCounted)} sub={todayS.activeKcal ? `of ${fmt(todayS.activeKcal)} on watch` : undefined} />
            </div>
          </div>

          {/* Milestone goal */}
          {m ? (
            <div className="card flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold">🎯 {m.label ?? "Milestone"}</h2>
                  <p className="text-xs text-muted">
                    {fmt(m.weight, 1)} kg by {shortDate(m.date)}
                    {nextM && <> · next: {fmt(nextM.weight, 1)} kg by {shortDate(nextM.date)}</>}
                  </p>
                </div>
                {status && (
                  <span className={`chip shrink-0 whitespace-nowrap ${good ? "bg-good-soft text-good" : "bg-warn-soft text-warn"}`}>
                    {good ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    {status === "ON TRACK" ? "On track" : status.charAt(0) + status.slice(1).toLowerCase()}
                  </span>
                )}
              </div>
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-xs text-muted">
                  <span>{fmt(m.fromWeight, 1)} kg</span>
                  <span className="font-semibold text-foreground">{fmt(goalPct, 0)}%</span>
                  <span>{fmt(m.weight, 1)} kg</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${goalPct}%` }} />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Stat label="Now" value={`${fmt(current, 2)} kg`} />
                <Stat label="Plan says" value={planned != null ? `${fmt(planned, 2)} kg` : "–"} />
                <Stat
                  label={ahead != null && ahead >= 0 ? "Ahead of plan" : "Behind plan"}
                  value={ahead != null ? `${fmt(Math.abs(ahead), 2)} kg` : "–"}
                  tone={ahead != null && ahead >= 0 ? "good" : "bad"}
                />
                <Stat label="Days left" value={daysLeft != null ? String(daysLeft) : "–"} />
              </div>
              <p className="mt-auto pt-4 text-xs text-muted">
                {kgLeft != null && `${fmt(kgLeft, 2)} kg to go`}
                {pace != null && ` · needs ${fmt(pace, 2)} kg/week`}
              </p>
            </div>
          ) : null}
        </section>

        <Charts
          days={stats.map((s) => ({
            date: new Date(s.date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
            weight: s.weight,
            goal: s.goalPath != null ? Math.round(s.goalPath * 100) / 100 : null,
            intake: s.logged ? Math.round(s.intake) : null,
            burn: Math.round(s.totalBurn),
            protein: s.logged ? Math.round(s.protein) : null,
            steps: s.steps,
            km: s.km != null ? Math.round(s.km * 100) / 100 : null,
          }))}
          kcalTarget={p.kcal_target}
          proteinTarget={p.protein_target}
          stepTarget={p.step_target}
        />

        {/* Weekly */}
        <section className="card overflow-x-auto">
          <h2 className="mb-3 font-bold">Weekly summary</h2>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted uppercase">
              <tr className="[&>th]:pb-2 [&>th]:font-semibold">
                <th>Week</th><th>Avg weight</th><th>Avg intake</th><th>Deficit</th><th>Fat lost</th><th>Protein</th><th>Steps</th><th>Distance</th><th>On target</th>
              </tr>
            </thead>
            <tbody>
              {weekly(p, stats).map((w) => (
                <tr key={w.week} className="border-t border-line [&>td]:py-2.5">
                  <td className="font-semibold">
                    Week {w.week}{" "}
                    <span className="font-normal text-muted">
                      {new Date(w.start + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </td>
                  <td>{w.avgWeight != null ? `${fmt(w.avgWeight, 2)} kg` : "–"}</td>
                  <td>{w.avgIntake != null ? `${fmt(w.avgIntake)} kcal` : "–"}</td>
                  <td>{fmt(w.deficit)}</td>
                  <td className="font-semibold text-good">{fmt(w.deficit / 7700, 2)} kg</td>
                  <td>{w.avgProtein != null ? `${fmt(w.avgProtein)} g` : "–"}</td>
                  <td>{w.avgSteps != null ? fmt(w.avgSteps) : "–"}</td>
                  <td>{w.km ? `${fmt(w.km, 1)} km` : "–"}</td>
                  <td>{w.onTarget}/{w.logged} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <p className="text-center text-xs text-muted">
          Burn = BMR (Mifflin-St Jeor) × {p.activity_factor} + watch kcal for steps above {fmt(p.base_steps ?? 3000)} · 7,700 kcal ≈ 1 kg of fat
        </p>
      </div>
    </>
  );
}

function shortDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
