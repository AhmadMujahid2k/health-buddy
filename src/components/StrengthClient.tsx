"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Minus, Plus, Trash2, TrendingUp } from "lucide-react";
import type { WorkoutSet } from "@/lib/queries";
import { e1rm, nextWorkout, setsFor, suggest, WORKOUT_KEYS, WORKOUTS, type Exercise, type SetRow, type WorkoutKey } from "@/lib/workouts";
import { PageHeader } from "./ui";

type Row = { weight: string; reps: string };
type Form = { date: string; workout: WorkoutKey; rows: Record<string, Row[]> };

const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const setText = (s: { weight: number | null; reps: number }, ex?: Exercise) =>
  `${s.weight != null ? `${s.weight}×` : ""}${s.reps}${ex?.unit === "sec" ? "s" : ""}`;
const exerciseOf = (name: string) => WORKOUT_KEYS.flatMap((k) => WORKOUTS[k].exercises).find((e) => e.name === name);

/** Sessions as { date, workout, sets }, oldest first. */
function sessionsOf(sets: WorkoutSet[]) {
  const map = new Map<string, { date: string; workout: WorkoutKey; sets: WorkoutSet[] }>();
  for (const s of sets) {
    const key = `${s.date}|${s.workout}`;
    if (!map.has(key)) map.set(key, { date: s.date, workout: s.workout as WorkoutKey, sets: [] });
    map.get(key)!.sets.push(s);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date) || a.workout.localeCompare(b.workout));
}

/** The most recent sets of an exercise logged before `date`. */
function lastSets(sets: WorkoutSet[], exercise: string, date: string): SetRow[] | undefined {
  const before = sets.filter((s) => s.exercise === exercise && s.date < date);
  const d = before.at(-1)?.date;
  return d ? before.filter((s) => s.date === d).sort((a, b) => a.set_no - b.set_no) : undefined;
}

function buildForm(sets: WorkoutSet[], date: string, workout: WorkoutKey): Form {
  const existing = sets.filter((s) => s.date === date && s.workout === workout);
  const done = sessionsOf(sets).filter((s) => s.date < date).length;
  const rows: Record<string, Row[]> = {};
  for (const ex of WORKOUTS[workout].exercises) {
    const logged = existing.filter((s) => s.exercise === ex.name).sort((a, b) => a.set_no - b.set_no);
    if (logged.length) {
      rows[ex.name] = logged.map((s) => ({ weight: s.weight?.toString() ?? "", reps: String(s.reps) }));
    } else {
      const sg = suggest(ex, lastSets(sets, ex.name, date));
      rows[ex.name] = Array.from({ length: setsFor(ex, done) }, () => ({ weight: sg.weight?.toString() ?? "", reps: "" }));
    }
  }
  return { date, workout, rows };
}

export function StrengthClient({ sets, today }: { sets: WorkoutSet[]; today: string }) {
  const router = useRouter();
  const sessions = useMemo(() => sessionsOf(sets), [sets]);
  const todays = sessions.find((s) => s.date === today);
  const [form, setForm] = useState<Form>(() =>
    buildForm(sets, today, todays?.workout ?? nextWorkout(sessions.filter((s) => s.date < today).at(-1)?.workout)),
  );
  const [saved, setSaved] = useState(false);

  const monday = (() => {
    const d = new Date(today + "T12:00:00");
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  })();
  const thisWeek = sessions.filter((s) => s.date >= monday && s.date <= today).length;
  const loggedNow = sessions.some((s) => s.date === form.date && s.workout === form.workout);

  const update = (f: Form) => { setForm(f); setSaved(false); };
  const setRow = (ex: string, i: number, patch: Partial<Row>) =>
    update({ ...form, rows: { ...form.rows, [ex]: form.rows[ex].map((r, j) => (j === i ? { ...r, ...patch } : r)) } });

  async function save() {
    const body = {
      date: form.date,
      workout: form.workout,
      sets: Object.entries(form.rows).flatMap(([exercise, rows]) =>
        rows.filter((r) => Number(r.reps) > 0).map((r, i) => ({ exercise, set_no: i + 1, weight: r.weight, reps: r.reps })),
      ),
    };
    await fetch("/api/workouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaved(true);
    router.refresh();
  }

  async function remove(date: string, workout: WorkoutKey) {
    if (!confirm(`Delete Workout ${workout} on ${fmtDate(date)}?`)) return;
    await fetch(`/api/workouts?date=${date}&workout=${workout}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Strength"
        subtitle="Workouts A → B → C, any 3 days a week · add reps until every set hits the top of the range, then move up"
        actions={<span className="chip bg-brand-soft text-brand"><Dumbbell size={14} /> {thisWeek}/3 this week</span>}
      />

      {/* Log a session */}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex gap-2">
            {WORKOUT_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => update(buildForm(sets, form.date, k))}
                className={`rounded-xl border px-4 py-2 text-left text-sm transition ${form.workout === k ? "border-brand bg-brand-soft" : "border-line hover:bg-card-2"}`}
              >
                <b>Workout {k}</b>
                <span className="block text-xs text-muted">{WORKOUTS[k].title}</span>
              </button>
            ))}
          </div>
          <label className="text-sm">
            <span className="text-muted">Date</span>
            <input className="input mt-1" type="date" value={form.date} max={today} onChange={(e) => e.target.value && update(buildForm(sets, e.target.value, form.workout))} />
          </label>
        </div>
        {loggedNow && <p className="text-xs text-muted">Already logged for this date: editing it.</p>}

        <div className="grid gap-3 lg:grid-cols-2">
          {WORKOUTS[form.workout].exercises.map((ex) => {
            const last = lastSets(sets, ex.name, form.date);
            const sg = suggest(ex, last);
            const rows = form.rows[ex.name];
            const bw = ex.equipment === "bodyweight";
            return (
              <div key={ex.name} className="rounded-xl border border-line p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{ex.name}</p>
                    <p className="text-xs text-muted">
                      {ex.range[0]}–{ex.range[1]} {ex.unit === "sec" ? "seconds" : "reps"}{ex.note ? ` · ${ex.note}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost px-2 py-1" aria-label="Remove a set" disabled={rows.length <= 1}
                      onClick={() => update({ ...form, rows: { ...form.rows, [ex.name]: rows.slice(0, -1) } })}><Minus size={14} /></button>
                    <button className="btn btn-ghost px-2 py-1" aria-label="Add a set"
                      onClick={() => update({ ...form, rows: { ...form.rows, [ex.name]: [...rows, { ...rows.at(-1)!, reps: "" }] } })}><Plus size={14} /></button>
                  </div>
                </div>
                <p className="mt-1.5 text-xs">
                  <span className="text-muted">Last: {last ? last.map((s) => setText(s, ex)).join(", ") : "–"}</span>
                  <span className="mx-1.5 text-muted">·</span>
                  <span className="font-semibold text-brand">Aim: {sg.text}</span>
                </p>
                <div className="mt-2 space-y-1.5">
                  {rows.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-10 shrink-0 text-xs text-muted">Set {i + 1}</span>
                      {!bw && (
                        <input className="input w-18! py-1.5! sm:w-24!" type="number" inputMode="decimal" step="0.5" placeholder={ex.equipment === "dumbbell" ? "BW" : "kg"}
                          aria-label={`${ex.name} set ${i + 1} weight`} value={r.weight} onChange={(e) => setRow(ex.name, i, { weight: e.target.value })} />
                      )}
                      {!bw && <span className="shrink-0 text-muted">kg ×</span>}
                      <input className="input w-18! py-1.5! sm:w-24!" type="number" inputMode="numeric" placeholder={String(sg.reps)}
                        aria-label={`${ex.name} set ${i + 1} ${ex.unit}`} value={r.reps} onChange={(e) => setRow(ex.name, i, { reps: e.target.value })} />
                      <span className="w-8 text-muted">{ex.unit === "sec" ? "sec" : "reps"}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <button className="btn" onClick={save}>{saved ? "✅ Saved" : `Save Workout ${form.workout}`}</button>
          <span className="text-xs text-muted">Leave reps empty for sets you didn&apos;t do. Rest 60–90 s between sets.</span>
        </div>
      </section>

      <Progress sets={sets} />

      {/* History */}
      {sessions.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-bold">Sessions</h2>
          <ul className="divide-y divide-line text-sm">
            {[...sessions].reverse().map((s) => (
              <li key={`${s.date}${s.workout}`} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <b>Workout {s.workout}</b> <span className="text-muted">· {fmtDate(s.date)}</span>
                  <p className="text-xs text-muted">
                    {[...new Set(s.sets.map((x) => x.exercise))]
                      .map((name) => `${name}: ${s.sets.filter((x) => x.exercise === name).map((x) => setText(x, exerciseOf(name))).join(", ")}`)
                      .join(" · ")}
                  </p>
                </div>
                <span className="flex shrink-0 gap-1">
                  <button className="btn btn-ghost py-1 text-xs" onClick={() => { update(buildForm(sets, s.date, s.workout)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                  <button className="btn btn-ghost px-2 py-1 text-bad" aria-label="Delete session" onClick={() => remove(s.date, s.workout)}><Trash2 size={14} /></button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** First vs latest best set per exercise, with estimated 1-rep max for weighted lifts. */
function Progress({ sets }: { sets: WorkoutSet[] }) {
  const rows = WORKOUT_KEYS.flatMap((k) =>
    WORKOUTS[k].exercises.flatMap((ex) => {
      const mine = sets.filter((s) => s.exercise === ex.name);
      if (!mine.length) return [];
      const dates = [...new Set(mine.map((s) => s.date))];
      const best = (d: string) =>
        mine.filter((s) => s.date === d).reduce((a, s) => ((e1rm(s.weight, s.reps) ?? s.reps) > (e1rm(a.weight, a.reps) ?? a.reps) ? s : a));
      const first = best(dates[0]);
      const latest = best(dates.at(-1)!);
      const score = (s: WorkoutSet) => e1rm(s.weight, s.reps) ?? s.reps;
      const top = mine.reduce((a, s) => (score(s) > score(a) ? s : a));
      return [{ k, ex, first, latest, top, sessions: dates.length, change: score(latest) - score(first) }];
    }),
  );
  if (!rows.length) return null;
  return (
    <section className="card overflow-x-auto">
      <h2 className="mb-1 flex items-center gap-2 font-bold"><TrendingUp size={16} className="text-brand" /> Progress</h2>
      <p className="mb-3 text-xs text-muted">Best set of the first and latest session. Est. max = the most you could lift once (Epley), from weight × reps.</p>
      <table className="w-full min-w-[620px] text-sm">
        <thead className="text-left text-xs text-muted uppercase">
          <tr className="[&>th]:pb-2 [&>th]:font-semibold"><th>Exercise</th><th>First</th><th>Latest</th><th>Best est. max</th><th>Sessions</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const max = e1rm(r.top.weight, r.top.reps);
            return (
              <tr key={r.ex.name} className="border-t border-line [&>td]:py-2">
                <td><span className="mr-1.5 text-xs text-muted">{r.k}</span>{r.ex.name}</td>
                <td>{setText(r.first, r.ex)}</td>
                <td>
                  {setText(r.latest, r.ex)}
                  {r.sessions > 1 && r.change !== 0 && (
                    <span className={`ml-1.5 text-xs font-semibold ${r.change > 0 ? "text-good" : "text-bad"}`}>{r.change > 0 ? "▲" : "▼"}</span>
                  )}
                </td>
                <td>{max != null ? `${max.toFixed(1)} kg` : `${r.top.reps}${r.ex.unit === "sec" ? " sec" : " reps"}`}</td>
                <td>{r.sessions}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
