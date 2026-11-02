import { addDays, today } from "./calc";
import { MEALS, type DraftItem, type Meal } from "./types";

/** A real calendar date (YYYY-MM-DD) no later than tomorrow, or with `future`, any date. */
export function validDate(v: unknown, { future = false } = {}): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return false;
  return future || v <= addDays(today(), 1);
}

/** A finite number within [min, max], or undefined. */
export function numIn(v: unknown, min: number, max: number): number | undefined {
  if (v === "" || v == null || typeof v === "boolean") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

/** "snacks", "Snack" → "snack"; anything unknown → null. */
export function toMeal(v: unknown): Meal | null {
  const m = String(v ?? "").toLowerCase().trim().replace(/s$/, "");
  return (MEALS as string[]).includes(m) ? (m as Meal) : null;
}

/** Cleans food lines from a request; returns null if any line is unusable. */
export function cleanItems(items: unknown): DraftItem[] | null {
  if (!Array.isArray(items)) return null;
  const out: DraftItem[] = [];
  for (const it of items as Record<string, unknown>[]) {
    const name = String(it?.name ?? "").trim();
    const kcal = numIn(it.kcal, 0, 10_000);
    const qty = numIn(it.qty ?? 1, 0, 1_000);
    const protein = numIn(it.protein ?? 0, 0, 1_000);
    if (!name || kcal === undefined || qty === undefined || protein === undefined) return null;
    const by = it.estimated_by === "table" || it.estimated_by === "claude" ? it.estimated_by : "manual";
    out.push({
      name, qty, kcal, protein,
      unit: String(it.unit ?? ""),
      food_id: Number.isInteger(Number(it.food_id)) && Number(it.food_id) > 0 ? Number(it.food_id) : null,
      estimated_by: by,
      text: String(it.text ?? ""),
    });
  }
  return out;
}

/** Allowed range for each day stat. */
export const STAT_RANGES = {
  weight: [30, 300],
  steps: [0, 100_000],
  distance_km: [0, 100],
  active_kcal: [0, 10_000],
  water_l: [0, 20],
  sleep_h: [0, 24],
} as const;

/**
 * Day stats from a request. `clearEmpty`: "" or null clears the stored value (edit form);
 * otherwise empty fields are skipped (day-log). Returns an error string for an out-of-range value.
 */
export function cleanStats(b: Record<string, unknown> | undefined, clearEmpty: boolean): Record<string, unknown> | string {
  const patch: Record<string, unknown> = {};
  if (!b) return patch;
  for (const [f, [min, max]] of Object.entries(STAT_RANGES)) {
    if (!(f in b) || b[f] === undefined) continue;
    if (b[f] === "" || b[f] == null) {
      if (clearEmpty) patch[f] = null;
      continue;
    }
    const n = numIn(b[f], min, max);
    if (n === undefined) return `${f} must be a number between ${min} and ${max}`;
    patch[f] = f === "steps" || f === "active_kcal" ? Math.round(n) : n;
  }
  if ("notes" in b && b.notes !== undefined) patch.notes = b.notes === "" || b.notes == null ? (clearEmpty ? null : undefined) : String(b.notes);
  if (patch.notes === undefined) delete patch.notes;
  return patch;
}

/** Positive integer id from a route param, or null. */
export const toId = (v: string) => (/^\d+$/.test(v) && Number(v) > 0 ? Number(v) : null);
