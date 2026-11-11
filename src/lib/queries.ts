import "server-only";
import { db } from "./db";
import { buildStats, today } from "./calc";
import type { DayRow, DraftItem, Entry, EntryItem, EventRow, Food, Meal, MilestoneRow, Profile } from "./types";

export function getProfile(): Profile {
  const p = db().prepare("SELECT * FROM profile WHERE id = 1").get() as Omit<Profile, "milestones">;
  return { ...p, milestones: getMilestones() };
}

export function getMilestones(): MilestoneRow[] {
  return db().prepare("SELECT id, label, weight, date FROM milestones ORDER BY date").all() as MilestoneRow[];
}

/** Replace all milestones at once (the Settings page saves the whole list). */
export function setMilestones(list: Omit<MilestoneRow, "id">[]) {
  const conn = db();
  const ins = conn.prepare("INSERT INTO milestones (label, weight, date) VALUES (@label, @weight, @date)");
  conn.transaction(() => {
    conn.prepare("DELETE FROM milestones").run();
    for (const m of list) ins.run(m);
  })();
}

export function updateProfile(patch: Partial<Profile>) {
  const cols = Object.keys(patch).filter((k) => k !== "id");
  if (!cols.length) return;
  db()
    .prepare(`UPDATE profile SET ${cols.map((c) => `${c} = @${c}`).join(", ")} WHERE id = 1`)
    .run(patch);
}

/** Save profile changes and (optionally) the milestone list together, so one can't be saved without the other. */
export function saveProfile(patch: Partial<Profile>, milestones?: Omit<MilestoneRow, "id">[]) {
  db().transaction(() => {
    updateProfile(patch);
    if (milestones) setMilestones(milestones);
  })();
}

export function getDays(): DayRow[] {
  return db().prepare("SELECT * FROM days ORDER BY date").all() as DayRow[];
}

export function getDay(date: string): DayRow | null {
  return (db().prepare("SELECT * FROM days WHERE date = ?").get(date) as DayRow) ?? null;
}

export function upsertDay(date: string, patch: Partial<Omit<DayRow, "date">>) {
  const cols = Object.keys(patch);
  const existing = getDay(date);
  if (!existing) {
    db().prepare("INSERT INTO days (date) VALUES (?)").run(date);
  }
  if (cols.length) {
    db()
      .prepare(
        `UPDATE days SET ${cols.map((c) => `${c} = @${c}`).join(", ")}, updated_at = datetime('now') WHERE date = @date`,
      )
      .run({ ...patch, date });
  }
}

export function foodTotalsByDate(): Map<string, { kcal: number; protein: number }> {
  const rows = db()
    .prepare(
      `SELECT e.date, SUM(i.kcal) kcal, SUM(i.protein) protein
       FROM entries e JOIN entry_items i ON i.entry_id = e.id GROUP BY e.date`,
    )
    .all() as { date: string; kcal: number; protein: number }[];
  return new Map(rows.map((r) => [r.date, { kcal: r.kcal, protein: r.protein }]));
}

export function getStats(until = today()) {
  const p = getProfile();
  const days = getDays();
  const lastDay = days.at(-1)?.date;
  const end = lastDay && lastDay > until ? lastDay : until;
  return { profile: p, stats: buildStats(p, days, foodTotalsByDate(), end) };
}

export function getEntries(date: string): Entry[] {
  const entries = db()
    .prepare("SELECT * FROM entries WHERE date = ? ORDER BY created_at, id")
    .all(date) as Omit<Entry, "items">[];
  const items = db()
    .prepare(
      `SELECT i.* FROM entry_items i JOIN entries e ON e.id = i.entry_id WHERE e.date = ? ORDER BY i.id`,
    )
    .all(date) as EntryItem[];
  return entries.map((e) => ({ ...e, items: items.filter((i) => i.entry_id === e.id) }));
}

export function addEntry(date: string, meal: Meal, rawText: string, source: string, items: DraftItem[]) {
  const conn = db();
  return conn.transaction(() => {
    const { lastInsertRowid } = conn
      .prepare("INSERT INTO entries (date, meal, raw_text, source) VALUES (?, ?, ?, ?)")
      .run(date, meal, rawText, source);
    const ins = conn.prepare(
      `INSERT INTO entry_items (entry_id, food_id, name, qty, unit, kcal, protein, estimated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const bump = conn.prepare("UPDATE foods SET uses = uses + 1 WHERE id = ?");
    for (const it of items) {
      ins.run(lastInsertRowid, it.food_id, it.name, it.qty, it.unit, it.kcal, it.protein, it.estimated_by);
      if (it.food_id) bump.run(it.food_id);
    }
    // make sure the day exists so it shows up in history
    conn.prepare("INSERT OR IGNORE INTO days (date) VALUES (?)").run(date);
    return Number(lastInsertRowid);
  })();
}

export function deleteEntry(id: number) {
  db().prepare("DELETE FROM entries WHERE id = ?").run(id);
}

export function deleteItem(id: number) {
  const conn = db();
  conn.transaction(() => {
    const row = conn.prepare("SELECT entry_id FROM entry_items WHERE id = ?").get(id) as
      | { entry_id: number }
      | undefined;
    conn.prepare("DELETE FROM entry_items WHERE id = ?").run(id);
    if (row) {
      const left = conn.prepare("SELECT COUNT(*) n FROM entry_items WHERE entry_id = ?").get(row.entry_id) as {
        n: number;
      };
      if (left.n === 0) conn.prepare("DELETE FROM entries WHERE id = ?").run(row.entry_id);
    }
  })();
}

export function getFoods(): Food[] {
  return db().prepare("SELECT * FROM foods ORDER BY uses DESC, name").all() as Food[];
}

export function upsertFood(f: Omit<Food, "id" | "uses"> & { id?: number }): number {
  const conn = db();
  const aliases = f.aliases
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
    .join(",");
  if (f.id) {
    conn
      .prepare("UPDATE foods SET name=?, aliases=?, unit=?, kcal=?, protein=?, note=?, source=? WHERE id=?")
      .run(f.name, aliases, f.unit, f.kcal, f.protein, f.note, f.source, f.id);
    return f.id;
  }
  const existing = conn.prepare("SELECT id FROM foods WHERE name = ?").get(f.name) as { id: number } | undefined;
  if (existing) return existing.id;
  return Number(
    conn
      .prepare("INSERT INTO foods (name, aliases, unit, kcal, protein, note, source) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(f.name, aliases, f.unit, f.kcal, f.protein, f.note, f.source).lastInsertRowid,
  );
}

/** A food whose name or one of its aliases equals `term` exactly (case-insensitive). */
export function findFoodByAlias(term: string): Food | null {
  const t = term.trim().toLowerCase();
  if (!t) return null;
  return (
    getFoods().find((f) => f.name.toLowerCase() === t || f.aliases.split(",").some((a) => a.trim() === t)) ?? null
  );
}

export function deleteFood(id: number) {
  db().prepare("DELETE FROM foods WHERE id = ?").run(id);
}

export function getEvents(): EventRow[] {
  return db().prepare("SELECT * FROM events ORDER BY date").all() as EventRow[];
}

export function upsertEvent(e: Omit<EventRow, "id"> & { id?: number }): number {
  const conn = db();
  const cols = "name=@name, date=@date, kind=@kind, yearly=@yearly, target_weight=@target_weight, extra_kcal=@extra_kcal, bank_days=@bank_days, notes=@notes";
  if (e.id) {
    conn.prepare(`UPDATE events SET ${cols} WHERE id=@id`).run(e);
    return e.id;
  }
  return Number(
    conn
      .prepare("INSERT INTO events (name, date, kind, yearly, target_weight, extra_kcal, bank_days, notes) VALUES (@name, @date, @kind, @yearly, @target_weight, @extra_kcal, @bank_days, @notes)")
      .run(e).lastInsertRowid,
  );
}

export function deleteEvent(id: number) {
  db().prepare("DELETE FROM events WHERE id = ?").run(id);
}

export type WorkoutSet = { id: number; date: string; workout: string; exercise: string; set_no: number; weight: number | null; reps: number };

export function getWorkoutSets(): WorkoutSet[] {
  return db().prepare("SELECT id, date, workout, exercise, set_no, weight, reps FROM workout_sets ORDER BY date, workout, id").all() as WorkoutSet[];
}

/** Replaces the sets of one session (date + workout). */
export function saveWorkout(date: string, workout: string, sets: Omit<WorkoutSet, "id" | "date" | "workout">[]) {
  const conn = db();
  const ins = conn.prepare("INSERT INTO workout_sets (date, workout, exercise, set_no, weight, reps) VALUES (?, ?, ?, ?, ?, ?)");
  conn.transaction(() => {
    conn.prepare("DELETE FROM workout_sets WHERE date = ? AND workout = ?").run(date, workout);
    for (const s of sets) ins.run(date, workout, s.exercise, s.set_no, s.weight, s.reps);
  })();
}

export function deleteWorkout(date: string, workout: string) {
  db().prepare("DELETE FROM workout_sets WHERE date = ? AND workout = ?").run(date, workout);
}
