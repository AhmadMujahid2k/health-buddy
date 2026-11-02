import { deleteWorkout, getWorkoutSets, saveWorkout } from "@/lib/queries";
import { WORKOUTS, type WorkoutKey } from "@/lib/workouts";

const valid = (date: unknown, workout: unknown): workout is WorkoutKey =>
  typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof workout === "string" && workout in WORKOUTS;

export async function GET() {
  return Response.json(getWorkoutSets());
}

/** Body: { date, workout: "A" | "B" | "C", sets: [{ exercise, set_no, weight, reps }] }. Replaces that session. */
export async function POST(req: Request) {
  const b = await req.json();
  if (!valid(b.date, b.workout)) return Response.json({ error: "date (YYYY-MM-DD) and workout (A/B/C) are required" }, { status: 400 });
  const names = new Set(WORKOUTS[b.workout as WorkoutKey].exercises.map((e) => e.name));
  const sets = (Array.isArray(b.sets) ? b.sets : [])
    .filter((s: Record<string, unknown>) => names.has(String(s.exercise)) && Number(s.reps) > 0)
    .map((s: Record<string, unknown>) => ({
      exercise: String(s.exercise),
      set_no: Number(s.set_no) || 1,
      weight: s.weight === "" || s.weight == null ? null : Number(s.weight),
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
