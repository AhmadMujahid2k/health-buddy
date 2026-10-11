import "server-only";
import { db } from "./db";
import { buildStats, today } from "./calc";
import type { DayRow, DraftItem, Entry, EntryItem, Food, Meal, Profile } from "./types";

export function getProfile(): Profile {
  return db().prepare("SELECT * FROM profile WHERE id = 1").get() as Profile;
}

export function updateProfile(patch: Partial<Profile>) {
  const cols = Object.keys(patch).filter((k) => k !== "id");
  if (!cols.length) return;
  db()
    .prepare(`UPDATE profile SET ${cols.map((c) => `${c} = @${c}`).join(", ")} WHERE id = 1`)
    .run(patch);
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
