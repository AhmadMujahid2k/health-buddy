import { updateProfile } from "@/lib/queries";
import type { Profile } from "@/lib/types";
import { numIn, validDate } from "@/lib/validate";

/** [min, max, nullable] for each number; anything outside is rejected with the field name. */
const NUMERIC: Record<string, [number, number, boolean]> = {
  height_cm: [100, 250, false],
  start_weight: [30, 300, false],
  goal_weight: [30, 300, false],
  activity_factor: [1, 2.5, false],
  kcal_target: [800, 6000, false],
  kcal_floor: [0, 6000, false],
  protein_target: [0, 400, false],
  step_target: [0, 100_000, false],
  water_target: [0, 20, false],
  sleep_target: [0, 24, false],
  base_steps: [0, 30_000, false],
  stride_m: [0.3, 1.5, false],
  milestone_weight: [30, 300, true],
  next_milestone_weight: [30, 300, true],
};
const INTEGER = new Set(["kcal_target", "kcal_floor", "protein_target", "step_target", "base_steps"]);
const DATES: Record<string, boolean> = { dob: false, start_date: false, milestone_date: true, next_milestone_date: true }; // nullable?
const TIMES = new Set(["eat_start", "eat_end"]);
const TEXT = new Set(["name", "milestone_label", "next_milestone_label", "food_context", "hidden_sections"]);
const CHOICES: Record<string, string[]> = { sex: ["male", "female"], claude_model: ["sonnet", "haiku", "opus"], voice_language: ["en", "auto"] };

const bad = (field: string, why: string) => Response.json({ error: `${field}: ${why}` }, { status: 400 });

export async function PUT(req: Request) {
  const b = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(b)) {
    const empty = v === "" || v == null;
    if (k in NUMERIC) {
      const [min, max, nullable] = NUMERIC[k];
      if (empty) {
        if (!nullable) return bad(k, "is required");
        patch[k] = null;
        continue;
      }
      const n = numIn(v, min, max);
      if (n === undefined) return bad(k, `must be between ${min} and ${max}`);
      patch[k] = INTEGER.has(k) ? Math.round(n) : n;
    } else if (k in DATES) {
      if (empty) {
        if (!DATES[k]) return bad(k, "is required");
        patch[k] = null;
      } else if (!validDate(v, { future: true })) return bad(k, "must be a date (YYYY-MM-DD)");
      else patch[k] = v;
    } else if (TIMES.has(k)) {
      if (empty) patch[k] = null;
      else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v))) return bad(k, "must be a time (HH:MM)");
      else patch[k] = String(v);
    } else if (k in CHOICES) {
      if (!CHOICES[k].includes(String(v))) return bad(k, `must be one of ${CHOICES[k].join(", ")}`);
      patch[k] = String(v);
    } else if (TEXT.has(k)) {
      patch[k] = empty ? null : String(v);
    }
  }
  updateProfile(patch as Partial<Profile>);
  return Response.json({ ok: true });
}
