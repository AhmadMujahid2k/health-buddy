import { deleteWorkout, getWorkoutSets, saveWorkout } from "@/lib/queries";
import { WORKOUTS, type WorkoutKey } from "@/lib/workouts";
import { numIn, validDate } from "@/lib/validate";

const valid = (date: unknown, workout: unknown): workout is WorkoutKey =>
  validDate(date) && typeof workout === "string" && workout in WORKOUTS;

export async function GET() {
  return Response.json(getWorkoutSets());
}

/** Body: { date, workout: "A" | "B" | "C", sets: [{ exercise, set_no, weight, reps }] }. Replaces that session. */
export async function POST(req: Request) {
  const b = await req.json();
  if (!valid(b.date, b.workout)) return Response.json({ error: "date (YYYY-MM-DD) and workout (A/B/C) are required" }, { status: 400 });
  const names = new Set(WORKOUTS[b.workout as WorkoutKey].exercises.map((e) => e.name));
  const sets = (Array.isArray(b.sets) ? b.sets : [])
    .filter((s: Record<string, unknown>) => names.has(String(s.exercise)) && numIn(s.reps, 1, 600) !== undefined)
    .map((s: Record<string, unknown>) => ({
      exercise: String(s.exercise),
      set_no: Math.round(numIn(s.set_no, 1, 20) ?? 1),
      weight: numIn(s.weight, 0.5, 500) ?? null,
      reps: Math.round(Number(s.reps)),
    }));
  saveWorkout(b.date, b.workout, sets);
  return Response.json({ ok: true, sets: sets.length });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const workout = searchParams.get("workout");
  if (!valid(date, workout)) return Response.json({ error: "date and workout are required" }, { status: 400 });
  deleteWorkout(date as string, workout);
  return Response.json({ ok: true });
}
