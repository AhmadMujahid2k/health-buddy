// Create a demo database full of made-up data (for screenshots / trying the app).
// Usage: node scripts/seed-demo.mjs [data/demo.db]   then   HEALTH_DB=data/demo.db npm start
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../src/lib/schema.mjs";

const out = path.resolve(process.argv[2] ?? "data/demo.db");
fs.mkdirSync(path.dirname(out), { recursive: true });
for (const f of [out, out + "-wal", out + "-shm"]) fs.rmSync(f, { force: true });

const db = new Database(out);
db.pragma("journal_mode = WAL");
migrate(db);

// deterministic "random" so screenshots are reproducible
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];

const DAYS = 21;
const toISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); // local date
const start = new Date();
start.setDate(start.getDate() - (DAYS - 1));
const startISO = toISO(start);
const milestone = new Date(start);
milestone.setDate(milestone.getDate() + 56);

db.prepare(
  `UPDATE profile SET name='Sam', dob='1996-04-12', height_cm=178, start_date=?, start_weight=95, goal_weight=80,
   kcal_target=1900, protein_target=130, step_target=8000, milestone_weight=90, milestone_date=?, milestone_label='First 5 kg'
   WHERE id=1`,
).run(startISO, toISO(milestone));

const food = (name) => db.prepare("SELECT * FROM foods WHERE name = ?").get(name);
const MENUS = {
  breakfast: [["Egg, boiled", 2, "Chai, no sugar", 1], ["Oats in milk", 1, "Banana", 1], ["Paratha", 1, "Chai with sugar", 1], ["Bread slice", 2, "Egg, fried / omelette", 2]],
  lunch: [["Chicken sandwich (home)", 1], ["Daal (home)", 1, "Roti (plain)", 2], ["Chicken pulao (plate)", 1, "Raita", 1], ["Guava (amrood)", 1, "Dahi (yogurt)", 1]],
  snack: [["Green tea", 1, "Apple", 1], ["Roasted chana", 1], ["Chai, no sugar", 1, "Tea biscuit", 2], ["Samosa (aloo)", 1]],
  dinner: [["Chicken salan / karahi", 1, "Roti (plain)", 2], ["Daal (home)", 1, "Roti (plain)", 2, "Salad", 1], ["Chicken tikka / boti (grilled)", 1, "Naan", 1], ["Chicken biryani (plate)", 1, "Raita", 1]],
};

const insEntry = db.prepare("INSERT INTO entries (date, meal, raw_text, source) VALUES (?, ?, ?, 'text')");
const insItem = db.prepare(
  "INSERT INTO entry_items (entry_id, food_id, name, qty, unit, kcal, protein, estimated_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'table')",
);
const insDay = db.prepare(
  "INSERT INTO days (date, weight, steps, active_kcal, water_l, sleep_h) VALUES (?, ?, ?, ?, ?, ?)",
);

let weight = 95;
db.transaction(() => {
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const date = toISO(d);
    weight += -0.09 + (rnd() - 0.5) * 0.45;
    const steps = Math.round(5500 + rnd() * 5500);
    insDay.run(date, i % 2 === 0 || i === DAYS - 1 ? Math.round(weight * 20) / 20 : null, steps, Math.round(steps * 0.048),
      Math.round((2 + rnd() * 1.5) * 2) / 2, Math.round((6 + rnd() * 2) * 2) / 2);
    if (i === DAYS - 1) {
      // today: only breakfast + lunch so far
      for (const meal of ["breakfast", "lunch"]) addMeal(date, meal);
      continue;
    }
    for (const meal of ["breakfast", rnd() < 0.7 ? "lunch" : null, rnd() < 0.6 ? "snack" : null, "dinner"].filter(Boolean)) addMeal(date, meal);
  }
})();

function addMeal(date, meal) {
  const combo = pick(MENUS[meal]);
  const parts = [];
  const { lastInsertRowid } = insEntry.run(date, meal, "");
  for (let j = 0; j < combo.length; j += 2) {
    const f = food(combo[j]);
    const qty = combo[j + 1];
    if (!f) continue;
    insItem.run(lastInsertRowid, f.id, f.name, qty, f.unit, Math.round(f.kcal * qty), Math.round(f.protein * qty * 10) / 10);
    parts.push(`${qty} ${f.name.toLowerCase()}`);
  }
  db.prepare("UPDATE entries SET raw_text = ? WHERE id = ?").run(parts.join(", "), lastInsertRowid);
}

console.log(`Demo database written to ${out} (${DAYS} days, made-up user "Sam")`);
