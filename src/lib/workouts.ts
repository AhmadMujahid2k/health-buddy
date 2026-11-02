/**
 * The three full-body home sessions (same as Manual/Workout_A/B/C.pdf) and the progression rules.
 * Double progression: stay at a weight and add reps until every set reaches the top of the range, then move up.
 */

export type Equipment = "dumbbell" | "barbell" | "curlbar" | "bodyweight";
export type Exercise = {
  name: string;
  equipment: Equipment;
  /** rep range, or seconds for holds */
  range: [number, number];
  unit: "reps" | "sec";
  /** sets in weeks 1-2, then later */
  sets: [number, number];
  start: number | null;
  /** shown next to the weight: "each hand", "each leg"… */
  note?: string;
};
export type WorkoutKey = "A" | "B" | "C";

export const WORKOUTS: Record<WorkoutKey, { title: string; exercises: Exercise[] }> = {
  A: {
    title: "Squat, press & pull",
    exercises: [
      { name: "Goblet squat (to the bench)", equipment: "dumbbell", range: [10, 12], unit: "reps", sets: [2, 3], start: 10 },
      { name: "Dumbbell bench press", equipment: "dumbbell", range: [10, 12], unit: "reps", sets: [2, 3], start: 5, note: "each hand" },
      { name: "One-arm dumbbell row", equipment: "dumbbell", range: [10, 12], unit: "reps", sets: [2, 3], start: 10, note: "each side" },
      { name: "Dumbbell Romanian deadlift", equipment: "dumbbell", range: [10, 12], unit: "reps", sets: [2, 3], start: 10, note: "each hand" },
      { name: "Hammer curl", equipment: "dumbbell", range: [12, 15], unit: "reps", sets: [2, 2], start: 5, note: "each hand" },
      { name: "Plank", equipment: "bodyweight", range: [20, 45], unit: "sec", sets: [3, 3], start: null },
    ],
  },
  B: {
    title: "Legs, shoulders & back",
    exercises: [
      { name: "Dumbbell step-ups", equipment: "dumbbell", range: [8, 12], unit: "reps", sets: [2, 3], start: null, note: "each leg" },
      { name: "Seated dumbbell shoulder press", equipment: "dumbbell", range: [10, 12], unit: "reps", sets: [2, 3], start: 5, note: "each hand" },
      { name: "Bent-over barbell row", equipment: "barbell", range: [10, 12], unit: "reps", sets: [2, 3], start: null, note: "total, incl. bar" },
      { name: "Glute bridge", equipment: "bodyweight", range: [15, 20], unit: "reps", sets: [3, 3], start: null },
      { name: "Seated overhead triceps extension", equipment: "dumbbell", range: [12, 15], unit: "reps", sets: [2, 2], start: 5 },
      { name: "Dead bug", equipment: "bodyweight", range: [8, 12], unit: "reps", sets: [3, 3], start: null, note: "each side" },
    ],
  },
  C: {
    title: "Lunge, bench & arms",
    exercises: [
      { name: "Dumbbell lunge", equipment: "dumbbell", range: [8, 12], unit: "reps", sets: [2, 3], start: null, note: "each leg" },
      { name: "Barbell bench press", equipment: "barbell", range: [8, 10], unit: "reps", sets: [2, 3], start: null, note: "total, incl. bar" },
      { name: "Bent-over two-dumbbell row", equipment: "dumbbell", range: [10, 12], unit: "reps", sets: [2, 3], start: 10, note: "each hand" },
      { name: "Side lateral raise", equipment: "dumbbell", range: [12, 15], unit: "reps", sets: [2, 2], start: 5, note: "each hand" },
      { name: "Curl-bar biceps curl", equipment: "curlbar", range: [12, 15], unit: "reps", sets: [2, 2], start: null, note: "total, incl. bar" },
      { name: "Side plank", equipment: "bodyweight", range: [15, 30], unit: "sec", sets: [2, 2], start: null, note: "each side" },
    ],
  },
};

export const WORKOUT_KEYS = Object.keys(WORKOUTS) as WorkoutKey[];

/** Home gym: fixed 5/10/15 kg dumbbells; bars load 5/10/15 kg plates in pairs, so the smallest jump is 10 kg. */
const DUMBBELLS = [5, 10, 15];
const BAR_STEP = 10;

export type SetRow = { exercise: string; set_no: number; weight: number | null; reps: number };

/** Epley estimated one-rep max; null for bodyweight or holds. */
export function e1rm(weight: number | null, reps: number): number | null {
  return weight && reps > 0 ? weight * (1 + reps / 30) : null;
}

export type Suggestion = { weight: number | null; reps: number; text: string };

/** What to aim for this session, from the last time this exercise was done. */
export function suggest(ex: Exercise, last: SetRow[] | undefined): Suggestion {
  const [lo, hi] = ex.range;
  const u = ex.unit === "sec" ? " sec" : "";
  if (!last?.length) {
    const w = ex.start;
    const what =
      w != null ? `${w} kg × ${lo}`
      : ex.equipment === "barbell" || ex.equipment === "curlbar" ? `empty bar × ${lo}`
      : ex.equipment === "dumbbell" ? `body weight × ${lo}`
      : `${lo}${u}`;
    return { weight: w, reps: lo, text: `${what} (first time)` };
  }
  const weight = last[0].weight;
  const topped = last.every((s) => s.reps >= hi);
  const best = Math.max(...last.map((s) => s.reps));

  if (!topped) {
    // bring the weakest set up; the best set already shows what's possible
    const worst = Math.min(...last.map((s) => s.reps));
    const reps = Math.min(Math.max(hi, best), worst + (ex.unit === "sec" ? 5 : 1));
    return { weight, reps, text: `${weight != null ? `${weight} kg × ` : ""}${reps}${u} on every set` };
  }
  if (weight == null && (ex.equipment === "barbell" || ex.equipment === "curlbar")) {
    return { weight: null, reps: lo, text: "Enter the bar's weight to track progress" };
  }
  if (ex.equipment === "bodyweight" || weight == null) {
    if (ex.unit === "sec") return { weight, reps: best + 5, text: `${best + 5} sec on every set` };
    return {
      weight: ex.equipment === "bodyweight" ? null : DUMBBELLS[0],
      reps: ex.equipment === "bodyweight" ? best + 2 : lo,
      text: ex.equipment === "bodyweight" ? `${best + 2} reps, slower` : `Add weight: ${DUMBBELLS[0]} kg × ${lo}`,
    };
  }
  if (ex.equipment === "dumbbell") {
    const next = DUMBBELLS.find((d) => d > weight);
    if (next) return { weight: next, reps: lo, text: `Move up: ${next} kg × ${lo}` };
    return { weight, reps: best + 1, text: `${weight} kg is your heaviest: ${best + 1} reps with a 3-second lower` };
  }
  return { weight: weight + BAR_STEP, reps: lo, text: `Move up: ${weight + BAR_STEP} kg × ${lo} (add a 5 kg plate each side)` };
}

/** Sets per exercise: the lighter count for the first 6 sessions (about 2 weeks), then the full count. */
export const setsFor = (ex: Exercise, sessionsDone: number) => (sessionsDone < 6 ? ex.sets[0] : ex.sets[1]);

/** Next workout in the A → B → C rotation. */
export const nextWorkout = (last: WorkoutKey | undefined): WorkoutKey =>
  last ? WORKOUT_KEYS[(WORKOUT_KEYS.indexOf(last) + 1) % WORKOUT_KEYS.length] : "A";
