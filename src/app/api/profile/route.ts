import { updateProfile } from "@/lib/queries";
import type { Profile } from "@/lib/types";

const NUMERIC = new Set([
  "height_cm", "start_weight", "goal_weight", "activity_factor", "kcal_target", "kcal_floor",
  "protein_target", "step_target", "water_target", "sleep_target", "milestone_weight", "base_steps", "stride_m", "next_milestone_weight",
]);
const TEXT = new Set(["name", "sex", "dob", "start_date", "milestone_date", "milestone_label", "next_milestone_date", "next_milestone_label", "eat_start", "eat_end", "claude_model", "voice_language", "food_context"]);

export async function PUT(req: Request) {
  const b = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(b)) {
    if (NUMERIC.has(k)) patch[k] = v === "" || v == null ? null : Number(v);
    else if (TEXT.has(k)) patch[k] = v === "" ? null : String(v);
  }
  updateProfile(patch as Partial<Profile>);
  return Response.json({ ok: true });
}
