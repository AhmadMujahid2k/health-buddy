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
db.pragma("foreign_keys = ON");
migrate(db);

// deterministic "random" so screenshots are reproducible
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];

const DAYS = 28; // 4 weeks, so the real-burn card has enough data
const toISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); // local date
const start = new Date();
start.setDate(start.getDate() - (DAYS - 1));
const startISO = toISO(start);
const milestone = new Date(start);
milestone.setDate(milestone.getDate() + 56);
const next = new Date(milestone);
next.setDate(next.getDate() + 70);

db.prepare(
  `UPDATE profile SET name='Sam', dob='1996-04-12', height_cm=178, start_date=?, start_weight=95, goal_weight=80,
   kcal_target=1900, protein_target=130, step_target=8000, eat_start='12:00', eat_end='20:30', stride_m=0.78
   WHERE id=1`,
).run(startISO);
const addMilestone = db.prepare("INSERT INTO milestones (label, weight, date) VALUES (?, ?, ?)");
addMilestone.run("First 5 kg", 90, toISO(milestone));
addMilestone.run("Next 5 kg", 85, toISO(next));

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
  "INSERT INTO days (date, weight, steps, distance_km, active_kcal, water_l, sleep_h) VALUES (?, ?, ?, ?, ?, ?, ?)",
);

let weight = 95;
db.transaction(() => {
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const date = toISO(d);
    weight += -0.09 + (rnd() - 0.5) * 0.45;
    const steps = Math.round(5500 + rnd() * 5500);
    // the band's km on most days; the app estimates the rest from steps × stride
    const km = rnd() < 0.7 ? Math.round(steps * 0.00079 * 100) / 100 : null;
    insDay.run(date, i % 2 === 0 || i === DAYS - 1 ? Math.round(weight * 20) / 20 : null, steps, km, Math.round(steps * 0.048),
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

// events: a yearly birthday with a weight goal, and a dawat coming up this week
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return toISO(d); };
const insEvent = db.prepare(
  "INSERT INTO events (name, date, kind, yearly, target_weight, extra_kcal, bank_days, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
);
insEvent.run("Sam's birthday", inDays(24), "birthday", 1, 91, 500, 3, null);
insEvent.run("Cousin's wedding", inDays(4), "wedding", 0, null, 1000, 3, "Mehndi + barat, BBQ and biryani");
insEvent.run("Dinner out", inDays(12), "restaurant", 0, null, 600, 2, null);

// strength: a week and a half of A → B → C, adding reps as it goes
const insSet = db.prepare("INSERT INTO workout_sets (date, workout, exercise, set_no, weight, reps) VALUES (?, ?, ?, ?, ?, ?)");
const SESSIONS = [
  [-9, "A", [["Goblet squat (to the bench)", 10, [10, 10]], ["Dumbbell bench press", 5, [11, 10]], ["One-arm dumbbell row", 10, [10, 10]], ["Plank", null, [25, 20, 20]]]],
  [-7, "B", [["Seated dumbbell shoulder press", 5, [10, 10]], ["Bent-over barbell row", 20, [10, 10]], ["Glute bridge", null, [15, 15, 15]]]],
  [-5, "C", [["Barbell bench press", 20, [10, 9]], ["Bent-over two-dumbbell row", 10, [10, 10]], ["Side lateral raise", 5, [12, 12]]]],
  [-2, "A", [["Goblet squat (to the bench)", 10, [12, 11]], ["Dumbbell bench press", 5, [12, 12]], ["One-arm dumbbell row", 10, [11, 11]], ["Plank", null, [30, 30, 25]]]],
];
db.transaction(() => {
  for (const [day, workout, exercises] of SESSIONS)
    for (const [exercise, w, reps] of exercises) reps.forEach((r, i) => insSet.run(inDays(day), workout, exercise, i + 1, w, r));
})();

console.log(`Demo database written to ${out} (${DAYS} days, events, workouts; made-up user "Sam")`);
