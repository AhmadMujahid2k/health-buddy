"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Apple, Check, Coffee, EggFried, Plus, Sandwich, Sparkles, Trash2, UtensilsCrossed, X, type LucideIcon,
} from "lucide-react";
import type { DayRow, DraftItem, Entry, Meal } from "@/lib/types";
import { MEALS } from "@/lib/types";
import { Bar, PageHeader } from "./ui";
import { VoiceButton } from "./VoiceButton";

const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner", drink: "Drink",
};
const MEAL_ICON: Record<Meal, LucideIcon> = {
  breakfast: EggFried, lunch: Sandwich, snack: Apple, dinner: UtensilsCrossed, drink: Coffee,
};
const prettyDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });

const PLACEHOLDER = `Tell me about your day, e.g.

Weight 82.5
Breakfast: 2 boiled eggs, chai no sugar
Lunch skipped
4pm green tea and an apple
Dinner: 2 roti with chicken karahi, 1 bowl dahi
7k steps, 5.2 km, 350 kcal from watch, 3 litres water, slept 7 hours`;

type Draft = DraftItem & { meal: Meal; baseKcal: number; baseProtein: number; baseQty: number };
const toDraft = (i: DraftItem & { meal: Meal }): Draft => ({ ...i, baseKcal: i.kcal, baseProtein: i.protein, baseQty: i.qty || 1 });

type DayValues = { weight: string; steps: string; distance_km: string; active_kcal: string; water_l: string; sleep_h: string; notes: string };
const STAT_KEYS = ["weight", "steps", "distance_km", "active_kcal", "water_l", "sleep_h"] as const;
const STAT_LABEL: Record<(typeof STAT_KEYS)[number], string> = {
  weight: "Weight", steps: "Steps", distance_km: "Distance", active_kcal: "Watch kcal", water_l: "Water", sleep_h: "Sleep",
};
const STAT_UNIT: Record<(typeof STAT_KEYS)[number], string> = {
  weight: "kg", steps: "", distance_km: "km", active_kcal: "kcal", water_l: "L", sleep_h: "h",
};

export function LogClient({
  date, isToday, entries, day, totals, targets,
}: {
  date: string;
  isToday: boolean;
  entries: Entry[];
  day: DayRow | null;
  totals: { intake: number; protein: number; burn: number; deficit: number };
  targets: { kcal: number; protein: number; floor: number };
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [source, setSource] = useState<"text" | "voice">("text");
  const [askClaude, setAskClaude] = useState(false);
  const [draft, setDraft] = useState<Draft[] | null>(null);
  const [found, setFound] = useState<Partial<Record<(typeof STAT_KEYS)[number], number>>>({});
  const [sections, setSections] = useState<{ meal: Meal; text: string }[]>([]);
  const [busy, setBusy] = useState<"estimate" | "save" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [dayV, setDayV] = useState<DayValues>({
    weight: String(day?.weight ?? ""),
    steps: String(day?.steps ?? ""),
    distance_km: String(day?.distance_km ?? ""),
    active_kcal: String(day?.active_kcal ?? ""),
    water_l: String(day?.water_l ?? ""),
    sleep_h: String(day?.sleep_h ?? ""),
    notes: day?.notes ?? "",
  });

  async function estimate() {
    if (!text.trim()) return;
    setBusy("estimate");
    setMsg(null);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, forceClaude: askClaude, hour: new Date().getHours() }),
      });
      const data = await res.json();
      setDraft((data.items as (DraftItem & { meal: Meal })[]).map(toDraft));
      setSections(data.sections ?? []);
      setFound(data.stats ?? {});
      // numbers found in the text fill the Body & activity card
      setDayV((v) => {
        const next = { ...v };
        for (const k of STAT_KEYS) if (data.stats?.[k] != null) next[k] = String(data.stats[k]);
        return next;
      });
      if (data.claudeError) setMsg(`Claude couldn't help (${data.claudeError}). Fill in the missing numbers yourself.`);
      else if (data.usedClaude) setMsg("Claude estimated the foods your table didn't know. They're saved to the food table now.");
    } finally {
      setBusy(null);
    }
  }

  const edit = (i: number, patch: Partial<Draft>) => setDraft((d) => d!.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const changeQty = (i: number, qty: number) =>
    setDraft((d) =>
      d!.map((x, j) =>
        j === i
          ? { ...x, qty, kcal: Math.round((x.baseKcal / x.baseQty) * qty), protein: Math.round((x.baseProtein / x.baseQty) * qty * 10) / 10 }
          : x,
      ),
    );

  async function saveDay() {
    setBusy("save");
    const byMeal = new Map<Meal, Draft[]>();
    for (const d of draft ?? []) if (d.name.trim()) byMeal.set(d.meal, [...(byMeal.get(d.meal) ?? []), d]);
    await fetch("/api/day-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        source,
        entries: [...byMeal].map(([meal, items]) => ({
          meal,
          raw_text: sections.filter((s) => s.meal === meal).map((s) => s.text).join(" · ") || text,
          items: items.map(({ baseKcal: _k, baseProtein: _p, baseQty: _q, meal: _m, ...i }) => i),
        })),
        stats: dayV,
      }),
    });
    setDraft(null);
    setFound({});
    setText("");
    setSource("text");
    setBusy(null);
    setMsg("Day saved.");
    router.refresh();
  }

  async function del(url: string) {
    await fetch(url, { method: "DELETE" });
    router.refresh();
  }

  const draftKcal = draft?.reduce((a, x) => a + (Number(x.kcal) || 0), 0) ?? 0;
  const draftProtein = draft?.reduce((a, x) => a + (Number(x.protein) || 0), 0) ?? 0;
  const foundKeys = STAT_KEYS.filter((k) => found[k] != null);

  return (
    <>
      <PageHeader
        title="Log your day"
        subtitle={
          isToday
            ? "Write or speak the whole day in one go. Meals, weight and activity are picked out for you."
            : <span className="text-warn">You&apos;re editing {prettyDate(date)}, not today.</span>
        }
        actions={<input type="date" className="input w-44" value={date} onChange={(e) => router.push(`/log?date=${e.target.value}`)} />}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Composer */}
          <section className="card space-y-3">
            <textarea
              className="input min-h-48 leading-relaxed"
              placeholder={PLACEHOLDER}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn" onClick={estimate} disabled={!!busy || !text.trim()}>
                {busy === "estimate" ? "Reading your day…" : <><Sparkles size={16} /> Estimate</>}
              </button>
              <VoiceButton
                onText={(t) => {
                  setText((old) => (old ? old + "\n" : "") + t);
                  setSource("voice");
                }}
              />
              <label className="ml-auto flex items-center gap-1.5 text-sm text-muted">
                <input type="checkbox" checked={askClaude} onChange={(e) => setAskClaude(e.target.checked)} />
                Ask Claude for everything
              </label>
            </div>
            <p className="text-xs text-muted">
              Start each meal with its name (breakfast, lunch, dinner, snack, &quot;4pm&quot;, &quot;at night&quot;). Foods in your table are
              instant; new foods go to Claude (~5–15 s).
            </p>
            {msg && <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{msg}</p>}

            {draft && (
              <div className="space-y-4 border-t border-line pt-4">
                {foundKeys.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted">Found in your text:</span>
                    {foundKeys.map((k) => (
                      <span key={k} className="chip bg-brand-soft text-brand">
                        {STAT_LABEL[k]} {Number(found[k]).toLocaleString()} {STAT_UNIT[k]}
                      </span>
                    ))}
                  </div>
                )}

                {MEALS.filter((m) => draft.some((d) => d.meal === m)).map((m) => {
                  const Icon = MEAL_ICON[m];
                  const rows = draft.map((d, i) => ({ d, i })).filter(({ d }) => d.meal === m);
                  return (
                    <div key={m} className="rounded-xl border border-line">
                      <div className="flex items-center justify-between border-b border-line bg-card-2 px-3 py-2 text-sm font-semibold">
                        <span className="flex items-center gap-2"><Icon size={15} className="text-brand" /> {MEAL_LABEL[m]}</span>
                        <span>{Math.round(rows.reduce((a, r) => a + (Number(r.d.kcal) || 0), 0))} kcal</span>
                      </div>
                      <div className="divide-y divide-line">
                        {rows.map(({ d: x, i }) => (
                          <div key={i} className="grid grid-cols-12 items-center gap-1.5 px-3 py-2 text-sm">
                            <input className="input col-span-12 sm:col-span-4" value={x.name} onChange={(e) => edit(i, { name: e.target.value })} />
                            <input className="input col-span-3 sm:col-span-2" type="number" step="0.5" inputMode="decimal" value={x.qty}
                              title={`qty (${x.unit})`} onChange={(e) => changeQty(i, Number(e.target.value))} />
                            <input className="input col-span-3 sm:col-span-2" type="number" inputMode="numeric" value={x.kcal} title="kcal"
                              onChange={(e) => edit(i, { kcal: Number(e.target.value), baseKcal: Number(e.target.value), baseQty: x.qty || 1, estimated_by: "manual" })} />
                            <input className="input col-span-3 sm:col-span-1" type="number" inputMode="decimal" value={x.protein} title="protein g"
                              onChange={(e) => edit(i, { protein: Number(e.target.value), baseProtein: Number(e.target.value), baseQty: x.qty || 1 })} />
                            <select className="input col-span-2 px-1 sm:col-span-2" value={x.meal} title="Move to meal"
                              onChange={(e) => edit(i, { meal: e.target.value as Meal })}>
                              {MEALS.map((mm) => <option key={mm} value={mm}>{MEAL_LABEL[mm]}</option>)}
                            </select>
                            <button aria-label="Remove" className="col-span-1 grid place-items-center text-muted hover:text-bad"
                              onClick={() => setDraft(draft.filter((_, j) => j !== i))}><X size={18} /></button>
                            <p className="col-span-12 -mt-0.5 text-xs text-muted">
                              {x.unit} · {x.estimated_by === "claude" ? "estimated by Claude" : x.estimated_by === "table" ? "from your food table" : "manual"}
                              <span className="hidden sm:inline"> · qty · kcal · protein g · meal</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="btn btn-ghost text-sm"
                    onClick={() =>
                      setDraft([...draft, toDraft({ name: "", qty: 1, unit: "serving", kcal: 0, protein: 0, food_id: null, estimated_by: "manual", text: "", meal: "snack" })])
                    }
                  >
                    <Plus size={15} /> Add item
                  </button>
                  <span className="ml-auto text-sm">
                    <b>{Math.round(draftKcal).toLocaleString()} kcal</b> · {Math.round(draftProtein)} g protein
                  </span>
                  <button className="btn" onClick={saveDay} disabled={!!busy}>
                    <Check size={16} /> {busy === "save" ? "Saving…" : "Save day"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* What's already saved for this date */}
          <section className="card space-y-3">
            <h2 className="font-bold">{isToday ? "Logged today" : `Logged on ${prettyDate(date)}`}</h2>
            <Bar label="Calories" value={totals.intake} max={targets.kcal} unit="kcal" overIsBad />
            <Bar label="Protein" value={totals.protein} max={targets.protein} unit="g" />
            <p className="text-sm text-muted">
              Burned ~{Math.round(totals.burn).toLocaleString()} kcal
              {totals.intake > 0 && ` · deficit ${Math.round(totals.deficit).toLocaleString()} kcal`}
              {totals.intake > 0 && totals.intake < targets.floor && " · under your minimum"}
            </p>
            {entries.length === 0 && <p className="text-sm text-muted">Nothing saved yet.</p>}
            {entries.map((e) => {
              const Icon = MEAL_ICON[e.meal as Meal] ?? UtensilsCrossed;
              return (
                <div key={e.id} className="border-t border-line pt-2.5">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-2"><Icon size={15} className="text-brand" /> {MEAL_LABEL[e.meal as Meal] ?? e.meal}</span>
                    <span>
                      {Math.round(e.items.reduce((a, i) => a + i.kcal, 0))} kcal
                      <button aria-label="Delete meal" className="ml-3 align-middle text-muted hover:text-bad"
                        onClick={() => confirm("Delete this whole meal?") && del(`/api/entries/${e.id}`)}><Trash2 size={15} /></button>
                    </span>
                  </div>
                  {e.raw_text && <p className="text-xs text-muted">“{e.raw_text}”</p>}
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {e.items.map((i) => (
                      <li key={i.id} className="flex justify-between gap-2">
                        <span>{i.qty !== 1 && `${i.qty} × `}{i.name}</span>
                        <span className="whitespace-nowrap text-muted">
                          {Math.round(i.kcal)} kcal · {Math.round(i.protein)} g
                          <button aria-label="Delete item" className="ml-2 align-middle text-muted hover:text-bad" onClick={() => del(`/api/items/${i.id}`)}><X size={14} /></button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        </div>

        <div className="space-y-5">
          <DayForm date={date} v={dayV} setV={setDayV} highlighted={foundKeys} />
        </div>
      </div>
    </>
  );
}

function DayForm({
  date, v, setV, highlighted,
}: { date: string; v: DayValues; setV: (f: (v: DayValues) => DayValues) => void; highlighted: string[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const field = (k: keyof DayValues, label: string, step = "1") => (
    <label className="text-sm">
      <span className="text-muted">{label}</span>
      <input
        className={`input mt-1 ${highlighted.includes(k) ? "border-brand" : ""}`} type="number" inputMode="decimal" step={step} value={v[k]}
        onChange={(e) => { setV((old) => ({ ...old, [k]: e.target.value })); setSaved(false); }}
      />
    </label>
  );
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-bold">Body & activity</h2>
        <p className="text-xs text-muted">Filled from your text when you press Estimate. Saved with &quot;Save day&quot;.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("weight", "Weight (kg)", "0.05")}
        {field("steps", "Steps")}
        {field("distance_km", "Distance (km)", "0.01")}
        {field("active_kcal", "Watch kcal")}
        {field("water_l", "Water (L)", "0.5")}
        {field("sleep_h", "Sleep (h)", "0.5")}
      </div>
      <textarea
        className="input" placeholder="Notes (optional)" value={v.notes}
        onChange={(e) => { setV((old) => ({ ...old, notes: e.target.value })); setSaved(false); }}
      />
      <button
        className="btn btn-ghost"
        onClick={async () => {
          await fetch(`/api/days/${date}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
          setSaved(true);
          router.refresh();
        }}
      >
        {saved ? <><Check size={16} /> Saved</> : "Save only these"}
      </button>
    </section>
  );
}
