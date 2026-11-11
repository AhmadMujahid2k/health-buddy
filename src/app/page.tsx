import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getEvents, getStats } from "@/lib/queries";
import { activeMilestone, ageOn, bmi, bmiCategory, daysBetween, fmt, fmtKm, goalStatus, nextMilestone, today } from "@/lib/calc";
import type { DayStats } from "@/lib/types";
import { Charts } from "@/components/Charts";
import { InsightsTicker } from "@/components/InsightsTicker";
import { JourneyMap } from "@/components/JourneyMap";
import { LiveBurn } from "@/components/LiveBurn";
import { Streaks } from "@/components/Streaks";
import { getInsights, getStreaks, JOURNEY } from "@/lib/insights";
import { hiddenSections, type BlockKey } from "@/lib/sections";
import { DashboardBlocks } from "@/components/DashboardBlocks";
import { kindOf, planEvents } from "@/lib/events";
import { realBurn } from "@/lib/tdee";
import { fastDay, ramadanPhase, ramadanWeights } from "@/lib/ramadan";
import { clock, hhmm } from "@/lib/prayer";
import { RealBurnCard } from "@/components/RealBurnCard";
import { DayList } from "@/components/DayList";
import { WeeklyTable } from "@/components/WeeklyTable";
import { weekly } from "@/lib/weekly";
import { BodyProgress } from "@/components/BodyProgress";
import { Bar, CalorieRing, KpiCard, PageHeader, Stat } from "@/components/ui";
import { Activity, AlertTriangle, ArrowUpDown, CalendarHeart, Moon, CheckCircle2, Download, Flame, PiggyBank, Plus, Scale, TrendingDown } from "lucide-react";

export default function Home(props: PageProps<"/">) {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Loading dashboard…</p>}>
      <Dashboard searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  await connection();
  const arranging = (await searchParams).arrange === "1";
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

  const recent = stats.filter((s) => s.logged && !s.partial).slice(-7);
  const weeks = weekly(p, stats);
  const avg = (f: (s: DayStats) => number) => (recent.length ? recent.reduce((a, s) => a + f(s), 0) / recent.length : 0);
  const totalDeficit = todayS.cumDeficit;

  const goalTotal = m ? m.fromWeight - m.weight : 0;
  const goalPct = m && goalTotal > 0 ? Math.min(100, Math.max(0, ((m.fromWeight - current) / goalTotal) * 100)) : 0;
  const good = status === "ON TRACK" || status === "GOAL REACHED";
  const ahead = planned != null ? planned - current : null;

  const hidden = hiddenSections(p.hidden_sections);
  const show = (key: string) => !hidden.has(key);
  const showToday = show("today");
  const showMilestone = show("milestone") && m != null;
  const showStreaks = show("streaks");
  const showJourney = show("journey");
  // Ramadan: on fasting days the eating window is iftar → sehri
  const rPhase = ramadanPhase(p, t);
  const fast = rPhase?.kind === "fasting" ? fastDay(p, t, rPhase.day) : null;
  const rWeights = rPhase?.kind === "guard" ? ramadanWeights(p, stats, t) : null;
  // the next event in the coming month, or one whose save-up days have started
  const nextEvent = show("events")
    ? planEvents(getEvents(), stats, t, current).find((e) => e.daysLeft >= 0 && (e.daysLeft <= 30 || e.bank?.today))
    : undefined;

  const chartProps = {
    days: stats.map((s) => ({
            date: new Date(s.date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
            weight: s.weight,
            goal: s.goalPath != null ? Math.round(s.goalPath * 100) / 100 : null,
            intake: s.logged ? Math.round(s.intake) : null,
            burn: Math.round(s.totalBurn),
            protein: s.logged ? Math.round(s.protein) : null,
            steps: s.steps,
            km: s.km != null ? Math.round(s.km * 100) / 100 : null,
          })),
    kcalTarget: p.kcal_target,
    proteinTarget: p.protein_target,
    stepTarget: p.step_target,
  };
  const blocks: { key: BlockKey; node: React.ReactNode }[] = [
    { key: "insights", node: show("insights") && <InsightsTicker items={getInsights(p, stats, t)} /> },
    { key: "ramadan", node: rPhase && show("ramadan") && (
          <Link href="/ramadan" className="card flex flex-wrap items-center gap-x-5 gap-y-2 py-3 text-sm transition hover:border-brand">
            <span className="flex items-center gap-2 font-semibold">
              <Moon size={16} className="text-brand" />
              {rPhase.kind === "upcoming" && `Ramadan starts in ${rPhase.daysUntil} day${rPhase.daysUntil === 1 ? "" : "s"}`}
              {rPhase.kind === "fasting" && `Ramadan · day ${rPhase.day} of ${rPhase.of}`}
              {rPhase.kind === "guard" && `Post-Eid guard · day ${rPhase.daysSinceEid} of 28`}
            </span>
            {fast && (
              <span className="text-muted">
                Sehri ends {clock(fast.sehriEnds)} · Iftar {clock(fast.iftar)} · {Math.floor(fast.fastMin / 60)}h {fast.fastMin % 60}m fast
              </span>
            )}
            {rWeights?.eid != null && rWeights.now != null && (
              <span className={rWeights.now - rWeights.eid > 0.5 ? "text-bad" : "text-good"}>
                {rWeights.now - rWeights.eid > 0 ? "+" : "−"}{fmt(Math.abs(rWeights.now - rWeights.eid), 1)} kg since Eid
              </span>
            )}
          </Link>
        ) },
    { key: "events", node: nextEvent && (
          <Link href="/events" className="card flex flex-wrap items-center gap-x-5 gap-y-2 py-3 text-sm transition hover:border-brand">
            <span className="flex items-center gap-2 font-semibold">
              <CalendarHeart size={16} className="text-brand" />
              {kindOf(nextEvent.event.kind).emoji} {nextEvent.event.name}
              <span className="font-normal text-muted">
                · {nextEvent.daysLeft === 0 ? "today" : nextEvent.daysLeft === 1 ? "tomorrow" : `in ${nextEvent.daysLeft} days`}
              </span>
            </span>
            {nextEvent.forecast != null && <span className="text-muted">~{fmt(nextEvent.forecast, 1)} kg on the day</span>}
            {nextEvent.event.target_weight != null && nextEvent.kcalGap != null && current > nextEvent.event.target_weight && (
              <span className={nextEvent.kcalGap > 0 ? "text-bad" : "text-good"}>
                {nextEvent.kcalGap > 0
                  ? `${fmt(Math.ceil(nextEvent.kcalGap / 10) * 10)} kcal/day short of ${fmt(nextEvent.event.target_weight, 1)} kg`
                  : `on time for ${fmt(nextEvent.event.target_weight, 1)} kg`}
              </span>
            )}
            {nextEvent.bank?.today && (
              <span className="flex items-center gap-1.5 text-brand">
                <PiggyBank size={14} /> save ~{fmt(nextEvent.bank.perDay)} kcal today
              </span>
            )}
          </Link>
        ) },
    { key: "kpis", node: show("kpis") && (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard icon={Scale} label="Current weight" value={`${fmt(current, 2)} kg`} sub={`${lost >= 0 ? "−" : "+"}${fmt(Math.abs(lost), 2)} kg since start`} />
          <KpiCard icon={Activity} label="BMI" value={fmt(b, 1)} sub={bmiCategory(b)} />
          <KpiCard icon={Flame} label="Est. fat lost" value={`${fmt(totalDeficit / 7700, 2)} kg`} sub={`${fmt(totalDeficit)} kcal total deficit`} tone={totalDeficit > 0 ? "good" : undefined} />
          <KpiCard icon={TrendingDown} label="Avg deficit · 7 days" value={`${fmt(avg((s) => s.deficit))} kcal`} sub={`avg intake ${fmt(avg((s) => s.intake))} kcal`} />
        </section>
        ) },
    { key: "goal", node: (showToday || showMilestone) && (
        <section className={`grid gap-5 ${showToday && showMilestone ? "lg:grid-cols-3" : ""}`}>
          {/* Today */}
          {showToday && (
          <div className={`card ${showMilestone ? "lg:col-span-2" : ""}`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Today</h2>
              <span className="text-xs text-muted">Target {fmt(p.kcal_target)} kcal · {p.protein_target} g protein</span>
            </div>
            {todayS.date === t && (
              <div className="mb-5">
                <LiveBurn
                  baseBurn={todayS.baseBurn}
                  activeCounted={todayS.activeCounted}
                  intake={todayS.intake}
                  eatStart={fast ? hhmm(fast.iftar) : p.eat_start}
                  eatEnd={fast ? hhmm(fast.sehriEnds) : p.eat_end}
                />
              </div>
            )}
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
              <Stat label="Deficit so far" value={todayS.logged ? fmt(todayS.deficit) : "–"} tone={todayS.deficit > 0 ? "good" : undefined} />
              <Stat label="Watch kcal counted" value={fmt(todayS.activeCounted)} sub={todayS.activeKcal ? `of ${fmt(todayS.activeKcal)} on watch` : undefined} />
            </div>
          </div>
          )}

          {/* Milestone goal */}
          {showMilestone && m ? (
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
        ) },
    { key: "body", node: show("body") && (
          <BodyProgress
            heightCm={p.height_cm}
            startWeight={p.start_weight}
            currentWeight={current}
            goalWeight={p.goal_weight}
            age={ageOn(p.dob, t)}
            male={p.sex === "male"}
          />
        ) },
    { key: "realburn", node: show("realburn") && (() => {
          const rb = realBurn(stats.filter((s) => s.date <= t), t);
          return rb ? <RealBurnCard data={rb} /> : null;
        })() },
    { key: "activity", node: (showStreaks || showJourney) && (
        <section className={`grid gap-5 ${showStreaks && showJourney ? "lg:grid-cols-5" : ""}`}>
          {showStreaks && (
          <div className={showJourney ? "lg:col-span-2" : ""}>
            <Streaks items={getStreaks(p, stats, t)} />
          </div>
          )}
          {showJourney && (
          <div className={`min-w-0 ${showStreaks ? "lg:col-span-3" : ""}`}>
            <JourneyMap
              name={JOURNEY.name}
              stops={JOURNEY.stops}
              totalKm={stats.filter((s) => s.date <= t).reduce((a, s) => a + (s.km ?? 0), 0)}
            />
          </div>
          )}
        </section>
        ) },
    { key: "chart_weight", node: show("chart_weight") && <Charts {...chartProps} only="chart_weight" /> },
    { key: "chart_calories", node: show("chart_calories") && <Charts {...chartProps} only="chart_calories" /> },
    { key: "chart_protein", node: show("chart_protein") && <Charts {...chartProps} only="chart_protein" /> },
    { key: "chart_steps", node: show("chart_steps") && <Charts {...chartProps} only="chart_steps" /> },
    { key: "recent", node: show("recent") && (
        <section className="card">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold">Recent days</h2>
            <span className="text-xs text-muted">Tap a day to view or edit it</span>
          </div>
          <DayList profile={p} stats={stats.filter((s) => s.date <= t)} limit={5} />
          <SeeAll href="/history">Full history</SeeAll>
        </section>
        ) },
    { key: "weekly", node: show("weekly") && (
        <section className="card overflow-x-auto">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold">Weekly summary</h2>
            <span className="text-xs text-muted">Small numbers = change from the week before</span>
          </div>
          <WeeklyTable weeks={weeks} today={t} limit={5} />
          <SeeAll href="/history?view=weeks">{weeks.length > 5 ? `All ${weeks.length} weeks` : "Weeks in History"}</SeeAll>
        </section>
        ) },
  ];

  return (
    <>
      <PageHeader
        title={`Hi ${p.name ?? "there"}`}
        subtitle={`${new Date(t + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · Day ${todayS.dayNo} of your journey`}
        actions={
          <>
            <Link href="/?arrange=1" className="btn btn-ghost" title="Change the order of the dashboard cards"><ArrowUpDown size={16} /> Rearrange</Link>
            <a href="/api/export" className="btn btn-ghost"><Download size={16} /> Export</a>
            <Link href="/log" className="btn"><Plus size={16} /> Log food</Link>
          </>
        }
      />

      <div className="space-y-5">
        <DashboardBlocks key={`${arranging}:${p.section_order}`} blocks={blocks} saved={p.section_order} arranging={arranging} />
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

/** "See all" link at the bottom of a dashboard card. */
function SeeAll({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 flex justify-end">
      <Link href={href} className="text-sm font-semibold text-brand hover:underline">
        {children} →
      </Link>
    </div>
  );
}
