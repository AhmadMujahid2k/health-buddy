"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { MAX_MILESTONES, type Profile } from "@/lib/types";
import { hiddenSections, SECTIONS } from "@/lib/sections";
import { OPTIONAL_TABS } from "@/lib/tabs";
import { failed } from "@/lib/http";
import { PageHeader } from "./ui";

const FIELDS: { key: keyof Profile; label: string; type?: string; step?: string }[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "dob", label: "Date of birth", type: "date" },
  { key: "height_cm", label: "Height (cm)", step: "0.1" },
  { key: "start_date", label: "Start date", type: "date" },
  { key: "start_weight", label: "Start weight (kg)", step: "0.05" },
  { key: "goal_weight", label: "Final goal (kg)", step: "0.5" },
  { key: "activity_factor", label: "Activity factor (1.2 = desk job)", step: "0.05" },
  { key: "base_steps", label: "Everyday steps already in base burn", step: "500" },
  { key: "stride_m", label: "Step length (m), for km from steps", step: "0.01" },
  { key: "eat_start", label: "Eating window starts (first meal)", type: "time" },
  { key: "eat_end", label: "Eating window ends (last meal)", type: "time" },
  { key: "kcal_target", label: "Daily calorie target" },
  { key: "kcal_floor", label: "Minimum calories" },
  { key: "protein_target", label: "Protein target (g)" },
  { key: "step_target", label: "Step target" },
  { key: "water_target", label: "Water target (L)", step: "0.5" },
  { key: "sleep_target", label: "Sleep target (h)", step: "0.5" },
  { key: "ramadan_start", label: "Ramadan: first fast", type: "date" },
  { key: "ramadan_end", label: "Ramadan: last fast", type: "date" },
  { key: "latitude", label: "Latitude (for sehri/iftar times)", step: "0.0001" },
  { key: "longitude", label: "Longitude", step: "0.0001" },
  { key: "utc_offset", label: "Time zone (hours from UTC)", step: "0.5" },
];

export function SettingsClient({ profile, startBmr }: { profile: Profile; startBmr: number }) {
  const router = useRouter();
  const { milestones: initialMilestones, ...fields } = profile;
  const [v, setV] = useState<Record<string, string | number | null>>({ ...fields });
  const [ms, setMs] = useState(initialMilestones.map((m) => ({ label: m.label ?? "", weight: String(m.weight), date: m.date })));
  // what's saved on the server, so Save only sends what changed here (and can't undo changes made elsewhere)
  const [base, setBase] = useState({ v, ms });
  const [saved, setSaved] = useState(false);
  const filledMs = ms.filter((m) => m.weight !== "" || m.date !== "" || m.label !== "");
  // a milestone heavier than the one before it (in date order) makes the plan line go up: allowed, but flagged
  const heavier = new Set(
    filledMs
      .map((m, i) => ({ i: ms.indexOf(m), date: m.date, w: Number(m.weight) }))
      .filter((m) => m.date && m.w)
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((m, k, arr) => m.w > (k ? arr[k - 1].w : Number(v.start_weight)))
      .map((m) => m.i),
  );
  const hidden = hiddenSections(v.hidden_sections as string | null);
  const hiddenTabs = hiddenSections(v.hidden_tabs as string | null);
  const toggle = (field: "hidden_sections" | "hidden_tabs", set: Set<string>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setV({ ...v, [field]: [...next].join(",") });
    setSaved(false);
  };
  const editMs = (i: number, patch: Partial<(typeof ms)[number]>) => {
    setMs(ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));
    setSaved(false);
  };
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Your profile, daily targets and goal" />
      <section className="card grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="text-sm">
            <span className="text-muted">{f.label}</span>
            <input
              className="input mt-1"
              type={f.type ?? "number"}
              step={f.step}
              inputMode={f.type ? undefined : "decimal"}
              value={(v[f.key] as string | number | null) ?? ""}
              onChange={(e) => { setV({ ...v, [f.key]: e.target.value }); setSaved(false); }}
            />
          </label>
        ))}
        <label className="text-sm">
          <span className="text-muted">Claude model for estimates</span>
          <select className="input mt-1" value={String(v.claude_model)} onChange={(e) => setV({ ...v, claude_model: e.target.value })}>
            <option value="sonnet">Sonnet (recommended: fast & accurate)</option>
            <option value="haiku">Haiku</option>
            <option value="opus">Opus (slowest)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted">Voice language (Whisper)</span>
          <select className="input mt-1" value={String(v.voice_language ?? "en")} onChange={(e) => setV({ ...v, voice_language: e.target.value })}>
            <option value="en">English / Roman Urdu mix (recommended)</option>
            <option value="auto">Auto-detect</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-muted">About your food (sent to Claude with each estimate)</span>
          <textarea
            className="input mt-1 min-h-24"
            placeholder="e.g. Pakistani home cooking in mustard oil. My chai is a big cup, 2:1 milk:water, ~150 kcal without sugar."
            value={String(v.food_context ?? "")}
            onChange={(e) => { setV({ ...v, food_context: e.target.value }); setSaved(false); }}
          />
        </label>
      </section>
      <section className="card">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-bold">Milestones</h2>
            <p className="text-xs text-muted">
              Weights to reach by a date on the way to your final goal, up to {MAX_MILESTONES}. The dashboard follows the
              earliest one until its date passes, then moves on to the next.
            </p>
          </div>
          <button
            className="btn btn-ghost"
            disabled={ms.length >= MAX_MILESTONES}
            onClick={() => { setMs([...ms, { label: "", weight: "", date: "" }]); setSaved(false); }}
          >
            <Plus size={16} /> Add milestone
          </button>
        </div>
        {ms.length === 0 && <p className="text-sm text-muted">No milestones yet. The dashboard shows your final goal only.</p>}
        <div className="space-y-3">
          {ms.map((m, i) => (
            <div key={i} className="grid items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_8rem_10rem_auto]">
              <label className="text-sm">
                <span className="text-muted">Name</span>
                <input className="input mt-1" type="text" maxLength={60} placeholder="e.g. Two digits by my birthday"
                  value={m.label} onChange={(e) => editMs(i, { label: e.target.value })} />
              </label>
              <label className="text-sm">
                <span className="text-muted">Weight (kg)</span>
                <input className="input mt-1" type="number" step="0.5" inputMode="decimal"
                  value={m.weight} onChange={(e) => editMs(i, { weight: e.target.value })} />
              </label>
              <label className="text-sm">
                <span className="text-muted">By date</span>
                <input className="input mt-1" type="date" value={m.date} onChange={(e) => editMs(i, { date: e.target.value })} />
              </label>
              <button
                className="btn btn-ghost"
                aria-label={`Remove milestone ${i + 1}`}
                onClick={() => { setMs(ms.filter((_, j) => j !== i)); setSaved(false); }}
              >
                <Trash2 size={16} /> Remove
              </button>
              {heavier.has(i) && (
                <p className="text-xs text-warn sm:col-span-4">
                  Heavier than the step before it, so the plan line goes up here. Fine for maintenance or bulking; check
                  the weight if you meant to lose.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h2 className="font-bold">Sidebar tabs</h2>
        <p className="mb-3 text-xs text-muted">Hide pages you don&apos;t use. Dashboard, Log food and Settings always stay.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {OPTIONAL_TABS.map((t) => (
            <label key={t.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-card-2">
              <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={!hiddenTabs.has(t.key)} onChange={() => toggle("hidden_tabs", hiddenTabs, t.key)} />
              {t.label}
            </label>
          ))}
        </div>
      </section>
      <section className="card">
        <h2 className="font-bold">Dashboard sections</h2>
        <p className="mb-3 text-xs text-muted">Switch off what you don&apos;t want to see. The rest of the dashboard closes the gap.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <label key={s.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-card-2">
              <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={!hidden.has(s.key)} onChange={() => toggle("hidden_sections", hidden, s.key)} />
              {s.label}
            </label>
          ))}
        </div>
      </section>
      <button
        className="btn"
        onClick={async () => {
          // one request: only the fields changed on this page, plus the milestones if they changed;
          // the server checks them together and saves both or neither
          const body: Record<string, unknown> = {};
          for (const [k, val] of Object.entries(v)) if (String(val ?? "") !== String(base.v[k] ?? "")) body[k] = val;
          if (JSON.stringify(filledMs) !== JSON.stringify(base.ms)) body.milestones = filledMs;
          if (Object.keys(body).length) {
            const err = await failed(
              await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
            );
            if (err) return alert(`Not saved: ${err}`);
          }
          setBase({ v, ms: filledMs });
          setSaved(true);
          router.refresh();
        }}
      >
        {saved ? "✅ Saved" : "Save settings"}
      </button>
      <p className="text-sm text-muted">
        Starting BMR: {startBmr.toLocaleString()} kcal · maintenance ≈ {Math.round(startBmr * Number(v.activity_factor || 1.2)).toLocaleString()} kcal/day.
        Watch kcal only count for steps above {Number(v.base_steps || 3000).toLocaleString()} a day, because everyday movement is already in the base burn.
      </p>
    </div>
  );
}
