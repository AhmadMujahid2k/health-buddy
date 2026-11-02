import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Droplets, Footprints, Moon, ShieldCheck, Sunrise, Sunset } from "lucide-react";
import { getStats } from "@/lib/queries";
import { addDays, daysBetween, fmt, today } from "@/lib/calc";
import { clock } from "@/lib/prayer";
import { fastDay, GUARD_DAYS, MEAL_SPLIT, ramadanPhase, ramadanWeights, timetable } from "@/lib/ramadan";
import { PageHeader, Stat } from "@/components/ui";

export default function RamadanPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
      <Ramadan />
    </Suspense>
  );
}

const longDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const shortDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const hours = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n), 1)} kg`;

async function Ramadan() {
  await connection();
  const t = today();
  const { profile: p, stats } = getStats(t);

  if (!p.ramadan_start || !p.ramadan_end) {
    return (
      <>
        <PageHeader title="Ramadan" subtitle="Sehri and iftar times, a calorie plan for fasting days, and a guard against regain after Eid" />
        <section className="card space-y-2 text-sm">
          <p>Set the first and last fast in <Link href="/settings" className="font-semibold text-brand underline">Settings</Link> to turn on Ramadan mode.</p>
          <p className="text-muted">Ramadan 1448 is expected to start around 8–9 February 2027, with Eid around 9–11 March. Update the dates once the moon is sighted.</p>
        </section>
      </>
    );
  }

  const phase = ramadanPhase(p, t);
  const days = timetable(p);
  const shown = phase?.kind === "fasting" ? fastDay(p, t, phase.day) : days[0];
  const w = ramadanWeights(p, stats, t);
  const eid = addDays(p.ramadan_end, 1);

  const status =
    t < p.ramadan_start
      ? `starts in ${daysBetween(t, p.ramadan_start)} days`
      : phase?.kind === "fasting"
        ? `Day ${phase.day} of ${phase.of}`
        : phase?.kind === "guard"
          ? `Eid was ${phase.daysSinceEid} day${phase.daysSinceEid === 1 ? "" : "s"} ago · post-Eid guard`
          : `Ended ${longDate(p.ramadan_end)}`;

  return (
    <>
      <PageHeader
        title="Ramadan"
        subtitle={`${longDate(p.ramadan_start)} → ${longDate(p.ramadan_end)} · ${days.length} fasts · ${status}`}
      />
      <div className="space-y-5">
        <section className="grid gap-5 lg:grid-cols-3">
          {/* Times */}
          <div className="card lg:col-span-2">
            <h2 className="mb-1 flex items-center gap-2 font-bold"><Moon size={16} className="text-brand" /> {phase?.kind === "fasting" ? "Today" : `First fast · ${shortDate(shown.date)}`}</h2>
            <p className="mb-4 text-xs text-muted">Worked out for your location (Fajr and Isha at 18°, Karachi method). Follow your masjid if it differs by a few minutes.</p>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-card-2 p-3 text-center sm:grid-cols-4">
              <Stat label="Sehri ends" value={clock(shown.sehriEnds)} sub="stop eating a few min before" />
              <Stat label="Iftar" value={clock(shown.iftar)} sub="Maghrib" />
              <Stat label="Fast" value={hours(shown.fastMin)} sub="without food or water" />
              <Stat label="Eating window" value={hours(1440 - shown.fastMin)} sub="iftar → sehri" />
            </div>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <li className="flex gap-2"><Sunset size={16} className="mt-0.5 shrink-0 text-brand" /> Iftar with dates and water, then pray, then eat the meal.</li>
              <li className="flex gap-2"><Footprints size={16} className="mt-0.5 shrink-0 text-brand" /> Walk after Taraweeh, or 1–2 h after iftar. Not hard in the last 2 hours of the fast.</li>
              <li className="flex gap-2"><Droplets size={16} className="mt-0.5 shrink-0 text-brand" /> 8 glasses between iftar and sehri: 2 at iftar, 4 through the evening, 2 at sehri.</li>
            </ul>
          </div>

          {/* Weight */}
          <div className="card flex flex-col">
            <h2 className="mb-3 flex items-center gap-2 font-bold"><ShieldCheck size={16} className="text-brand" /> Weight</h2>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Before Ramadan" value={w?.before != null && t >= p.ramadan_start ? `${fmt(w.before, 1)} kg` : "–"} />
              <Stat label="At Eid" value={w?.eid != null && t > p.ramadan_end ? `${fmt(w.eid, 1)} kg` : "–"} />
              <Stat label="Now" value={w?.now != null ? `${fmt(w.now, 1)} kg` : "–"} />
              <Stat
                label={t > p.ramadan_end ? "Since Eid" : "Since day 1"}
                value={
                  t > p.ramadan_end && w?.eid != null && w.now != null ? signed(w.now - w.eid)
                  : t >= p.ramadan_start && w?.before != null && w.now != null ? signed(w.now - w.before)
                  : "–"
                }
                tone={t > p.ramadan_end && w?.eid != null && w.now != null && w.now - w.eid > 0.5 ? "bad" : undefined}
              />
            </div>
            <p className="mt-auto pt-4 text-xs text-muted">
              Weigh after sehri and Fajr, before sleeping again, so the numbers stay comparable.
            </p>
          </div>
        </section>

        {/* Calorie split */}
        <section className="grid gap-5 md:grid-cols-3">
          {MEAL_SPLIT.map((m) => (
            <div key={m.meal} className="card">
              <div className="flex items-baseline justify-between">
                <h2 className="font-bold">{m.meal}</h2>
                <span className="text-sm font-semibold">~{fmt(Math.round((p.kcal_target * m.share) / 10) * 10)} kcal</span>
              </div>
              <p className="mb-2 text-xs text-muted">{Math.round(m.share * 100)}% of {fmt(p.kcal_target)} · protein ~{fmt(p.protein_target * m.protein)} g</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">{m.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
            </div>
          ))}
        </section>

        {/* Post-Eid guard */}
        <section className="card">
          <h2 className="mb-1 font-bold">🛡️ Post-Eid guard · {shortDate(eid)} → {shortDate(addDays(eid, GUARD_DAYS - 1))}</h2>
          <p className="mb-3 text-sm text-muted">
            Most people regain their Ramadan weight within 2–5 weeks of Eid, as eating moves back to all day and the Eid sweets keep coming.
            For {GUARD_DAYS} days after Eid the dashboard shows your weight against your Eid weight.
          </p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            <li>✅ Enjoy Eid day itself, then back to normal portions the next day</li>
            <li>✅ Go back to your usual eating window; don't add sehri-style late snacks</li>
            <li>✅ Sheer khurma and mithai: one small serving a day while they're in the house</li>
            <li>✅ Keep the Taraweeh walk habit as an evening walk</li>
          </ul>
        </section>

        {/* Timetable */}
        <section className="card overflow-x-auto">
          <h2 className="mb-3 flex items-center gap-2 font-bold"><Sunrise size={16} className="text-brand" /> Timetable</h2>
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs text-muted uppercase">
              <tr className="[&>th]:pb-2 [&>th]:font-semibold"><th>Fast</th><th>Date</th><th>Sehri ends</th><th>Iftar</th><th>Isha</th><th>Fast length</th></tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className={`border-t border-line [&>td]:py-1.5 ${d.date === t ? "bg-brand-soft font-semibold" : ""}`}>
                  <td>{d.day}</td>
                  <td>{shortDate(d.date)}</td>
                  <td>{clock(d.sehriEnds)}</td>
                  <td>{clock(d.iftar)}</td>
                  <td>{clock(d.isha)}</td>
                  <td>{hours(d.fastMin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
