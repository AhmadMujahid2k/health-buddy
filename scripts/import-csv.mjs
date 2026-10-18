// Import a daily CSV log into data/health.db (columns: date, weight_kg, breakfast_kcal, lunch_kcal, dinner_kcal,
// snacks_kcal, chai_drinks_kcal, protein_g, steps, exercise, exercise_kcal, water_l, sleep_h, food_details, notes).
// Safe to re-run: imported rows for a date are replaced, app-logged rows are kept.
// Usage: node scripts/import-csv.mjs [path/to/daily_log.csv]
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../src/lib/schema.mjs";

const csvPath = process.argv[2] ?? path.resolve("daily_log.csv");
const dbPath = process.env.HEALTH_DB ?? path.resolve("data/health.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x !== ""));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const num = (v) => (v === "" || v == null ? null : Number(v));
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
migrate(db);

const MEAL_COLS = [
  ["breakfast", "breakfast_kcal"],
  ["lunch", "lunch_kcal"],
  ["dinner", "dinner_kcal"],
  ["snack", "snacks_kcal"],
  ["drink", "chai_drinks_kcal"],
];

const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
const upsertDay = db.prepare(`
  INSERT INTO days (date, weight, steps, distance_km, active_kcal, water_l, sleep_h, notes)
  VALUES (@date, @weight, @steps, @distance_km, @active_kcal, @water_l, @sleep_h, @notes)
  ON CONFLICT(date) DO UPDATE SET weight=excluded.weight, steps=excluded.steps, distance_km=excluded.distance_km, active_kcal=excluded.active_kcal,
    water_l=excluded.water_l, sleep_h=excluded.sleep_h, notes=excluded.notes, updated_at=datetime('now')`);
const delImported = db.prepare("DELETE FROM entries WHERE date = ? AND source = 'import'");
const insEntry = db.prepare("INSERT INTO entries (date, meal, raw_text, source) VALUES (?, ?, ?, 'import')");
const insItem = db.prepare(
  "INSERT INTO entry_items (entry_id, name, qty, unit, kcal, protein, estimated_by) VALUES (?, ?, 1, 'meal', ?, ?, 'import')",
);

let n = 0;
db.transaction(() => {
  for (const r of rows) {
    upsertDay.run({
      date: r.date,
      weight: num(r.weight_kg),
      steps: num(r.steps),
      distance_km: num(r.walk_km),
      active_kcal: num(r.exercise_kcal),
      water_l: num(r.water_l),
      sleep_h: num(r.sleep_h),
      notes: [r.exercise, r.notes].filter(Boolean).join(" · ") || null,
    });
    delImported.run(r.date);
    const meals = MEAL_COLS.map(([meal, col]) => [meal, num(r[col])]).filter(([, k]) => k);
    const totalKcal = meals.reduce((s, [, k]) => s + k, 0);
    const protein = num(r.protein_g) ?? 0;
    meals.forEach(([meal, kcal], i) => {
      const { lastInsertRowid } = insEntry.run(r.date, meal, i === 0 ? r.food_details : null);
      const label = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snacks", drink: "Chai / drinks" }[meal];
      // the CSV only has a daily protein total, so share it out by calories
      insItem.run(lastInsertRowid, `${label} (imported)`, kcal, Math.round((protein * kcal) / totalKcal * 10) / 10);
    });
    n++;
  }
})();
console.log(`Imported ${n} days from ${csvPath} into ${dbPath}`);
