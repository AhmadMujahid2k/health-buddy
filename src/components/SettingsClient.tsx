"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
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
  { key: "kcal_target", label: "Daily calorie target" },
  { key: "kcal_floor", label: "Minimum calories" },
  { key: "protein_target", label: "Protein target (g)" },
  { key: "step_target", label: "Step target" },
  { key: "water_target", label: "Water target (L)", step: "0.5" },
  { key: "sleep_target", label: "Sleep target (h)", step: "0.5" },
  { key: "milestone_label", label: "Milestone name", type: "text" },
  { key: "milestone_weight", label: "Milestone weight (kg)", step: "0.5" },
  { key: "milestone_date", label: "Milestone date", type: "date" },
  { key: "next_milestone_label", label: "Next milestone name", type: "text" },
  { key: "next_milestone_weight", label: "Next milestone weight (kg)", step: "0.5" },
  { key: "next_milestone_date", label: "Next milestone date", type: "date" },
];

export function SettingsClient({ profile, startBmr }: { profile: Profile; startBmr: number }) {
  const router = useRouter();
  const [v, setV] = useState<Record<string, string | number | null>>({ ...profile });
  const [saved, setSaved] = useState(false);
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
      <button
        className="btn"
        onClick={async () => {
          await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
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
