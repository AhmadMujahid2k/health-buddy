// Database schema + seed data. Plain JS so scripts/ can share it with the app.

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT,
  sex TEXT NOT NULL DEFAULT 'male',
  dob TEXT NOT NULL,
  height_cm REAL NOT NULL,
  start_date TEXT NOT NULL,
  start_weight REAL NOT NULL,
  goal_weight REAL NOT NULL,
  activity_factor REAL NOT NULL DEFAULT 1.2,
  kcal_target INTEGER NOT NULL,
  kcal_floor INTEGER NOT NULL DEFAULT 1500,
  protein_target INTEGER NOT NULL,
  step_target INTEGER NOT NULL,
  water_target REAL NOT NULL DEFAULT 3,
  sleep_target REAL NOT NULL DEFAULT 7,
  milestone_weight REAL,
  milestone_date TEXT,
  milestone_label TEXT,
  next_milestone_weight REAL,
  next_milestone_date TEXT,
  next_milestone_label TEXT,
  claude_model TEXT NOT NULL DEFAULT 'sonnet',
  voice_language TEXT NOT NULL DEFAULT 'en',
  base_steps INTEGER NOT NULL DEFAULT 3000,
  food_context TEXT
);

-- One row per day: body + activity numbers (food lives in entries)
CREATE TABLE IF NOT EXISTS days (
  date TEXT PRIMARY KEY,            -- YYYY-MM-DD, server local time
  weight REAL,
  steps INTEGER,
  active_kcal INTEGER,              -- watch workout/active kcal, on top of BMR x factor
  water_l REAL,
  sleep_h REAL,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One logged meal / message ("2 roti, chai no sugar")
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  meal TEXT NOT NULL,               -- breakfast | lunch | dinner | snack | drink
  raw_text TEXT,
  source TEXT NOT NULL DEFAULT 'text', -- text | voice | import
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS entries_date ON entries(date);

CREATE TABLE IF NOT EXISTS entry_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  food_id INTEGER REFERENCES foods(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  unit TEXT,
  kcal REAL NOT NULL,               -- total for this line (qty already applied)
  protein REAL NOT NULL DEFAULT 0,
  estimated_by TEXT NOT NULL DEFAULT 'table' -- table | claude | manual | import
);
CREATE INDEX IF NOT EXISTS items_entry ON entry_items(entry_id);

-- Food library. Values are per one unit.
CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  aliases TEXT NOT NULL DEFAULT '', -- comma separated, lowercase
  unit TEXT NOT NULL,
  kcal REAL NOT NULL,
  protein REAL NOT NULL DEFAULT 0,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'seed', -- seed | claude | user
  uses INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// Placeholder profile for a fresh install — change it on the Settings page.
export const PROFILE_SEED = {
  name: null,
  sex: "male",
  dob: "1995-01-01",
  height_cm: 175,
  start_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10),
  start_weight: 90,
  goal_weight: 75,
  activity_factor: 1.2,
  kcal_target: 1800,
  kcal_floor: 1500,
  protein_target: 130,
  step_target: 8000,
  water_target: 3,
  sleep_target: 7,
  milestone_weight: null,
  milestone_date: null,
  milestone_label: null,
  next_milestone_weight: null,
  next_milestone_date: null,
  next_milestone_label: null,
  claude_model: "sonnet",
  base_steps: 3000,
  food_context: null,
};

// [name, aliases, unit, kcal, protein, note]
// Typical South Asian home portions. Edit freely on the Food library page.
export const FOODS_SEED = [
  ["Chai, no sugar", "chai without sugar,chai no sugar,chai bina cheeni,chai bina chini,chai without sigar,tea without sugar,tea no sugar,sugar free chai,chai", "cup", 150, 6, "Big cup, milky (doodh patti)"],
  ["Chai with sugar", "chai with sugar,chai sugar wali,cheeni wali chai,chai with sigar,tea with sugar,meethi chai", "cup", 200, 6, "Big cup + 1 tbsp sugar"],
  ["Green tea", "green tea,lipton green,lipton green tea,qehwa,kahwa", "cup", 2, 0, "No sugar"],
  ["Black coffee / Americano", "americano,black coffee,coffee black", "cup", 10, 0, ""],
  ["Latte", "latte,cafe latte", "cup", 150, 8, "Regular, no syrup"],
  ["Spanish latte", "spanish latte", "cup", 280, 9, "Has condensed milk"],
  ["Soft drink", "coke,pepsi,sprite,7up,soft drink,cold drink,fanta,dew", "can 345 ml", 145, 0, ""],
  ["Roti (plain)", "roti,chapati,chapatti,phulka,rotis,rotiyan", "piece", 120, 4, "Medium, ~40 g atta"],
  ["Chupri roti (with desi ghee)", "chupri,chopri,chupri roti,chopri roti,ghee wali roti,roti with ghee", "piece", 165, 4, "Roti + ~1 tsp ghee"],
  ["Naan", "naan,nan,tandoori naan", "piece", 300, 9, ""],
  ["Paratha", "paratha,parantha,prantha", "piece", 300, 6, "Cooked in ghee/oil"],
  ["Bread slice", "bread,bread slice,slice bread,white bread,slices of bread", "slice", 75, 2.5, ""],
  ["Rusk", "rusk,rusks,papay", "piece", 60, 1, "Plain bakery rusk"],
  ["Cake rusk", "cake rusk,cake rusks", "piece", 100, 1.5, ""],
  ["Egg, boiled", "boiled egg,boiled eggs,egg,eggs,anda,anday,ubla anda,ublay anday", "piece", 75, 6, "Large farm egg"],
  ["Egg, fried / omelette", "fried egg,omelette,omelet,anda fry,fry anda", "piece", 120, 6, "With oil"],
  ["Oats in milk", "oats,oatmeal,daliya,oats in milk", "bowl", 400, 15, "~40 g oats + 250 ml full-fat milk"],
  ["Doodh wali sawaiyan", "sawaiyan,sewaiyan,sheer khurma,doodh wali sawaiyan,vermicelli", "bowl", 350, 9, "Home made, with sugar"],
  ["Daal (home)", "daal,dal,daal chawal daal,moong daal,masoor daal,mongi masoor ki daal,mash ki daal,chana daal", "bowl", 220, 12, "200 g, home style"],
  ["Chana (cholay)", "chana,chanay,cholay,choley,chickpeas,chanay ka salan", "bowl", 200, 9, ""],
  ["Roasted chana", "roasted chana,bhuna chana,bhunay chanay", "handful", 120, 6, "~30 g"],
  ["Sabzi (mixed, home)", "sabzi,sabji,vegetable,mix sabzi,tori,bhindi,lauki,kaddu", "bowl", 160, 4, "In oil"],
  ["Aloo methi", "aloo methi,alu methi", "bowl", 255, 4, "In mustard oil"],
  ["Shaljam gosht", "shaljam gosht,shaljam,turnip gosht", "bowl", 300, 18, "With beef"],
  ["Chicken salan / karahi", "chicken salan,chicken karahi,karahi,chicken curry,salan", "bowl", 350, 28, "Home, 200 g"],
  ["Chicken boti (curry piece)", "chicken boti,chicken piece,desi chicken boti,boti", "piece", 120, 15, ""],
  ["Mutton boti", "mutton boti,mutton piece,gosht boti", "piece", 125, 9, "Small, cooked"],
  ["Beef boti", "beef boti,beef piece", "piece", 110, 9, "Small, cooked"],
  ["BBQ chicken leg (with thigh)", "bbq leg,bbq leg piece,leg piece,chicken leg,bbq chicken leg", "piece", 300, 35, "Grilled"],
  ["Chicken tikka / boti (grilled)", "chicken tikka,tikka,bbq boti,seekh boti", "200 g", 330, 50, "Top fat-loss choice"],
  ["Seekh kabab", "seekh kabab,seekh kebab", "piece", 150, 10, ""],
  ["Shami kabab (no oil)", "shami kabab,shami,shami kebab", "piece", 130, 9, "Cooked without oil"],
  ["Shami kabab (fried)", "fried shami,shami fried,fried shami kabab", "piece", 180, 9, ""],
  ["Fried chicken piece", "fried chicken,broast,chicken broast,fried chicken piece", "piece", 250, 20, ""],
  ["Chicken nugget", "nugget,nuggets,chicken nugget,chicken nuggets", "piece", 60, 3, ""],
  ["Home-made patty burger", "patty burger,home burger,homemade burger,home made burger,beef burger", "piece", 450, 22, ""],
  ["Anda shami burger", "anda shami burger,anda wala burger,egg shami burger,bun kabab,bun kebab", "piece", 600, 20, "Street style"],
  ["KFC Kentucky burger", "kentucky burger,kfc burger", "piece", 520, 25, ""],
  ["Zinger burger", "zinger,zinger burger", "piece", 550, 25, ""],
  ["French fries (regular)", "fries,french fries,chips", "regular", 330, 4, ""],
  ["Pizza slice", "pizza,pizza slice,fajita pizza,tikka pizza", "slice", 300, 13, "Medium/large pizza"],
  ["Puff pastry (chicken patty)", "puff pastry,patties,chicken patty,puff patty,pastry", "piece", 250, 7, "Bakery/home"],
  ["Chicken macaroni", "macaroni,chicken macaroni,pasta", "bowl", 400, 16, "Home made, full bowl"],
  ["Chicken sandwich (home)", "sandwich,home sandwich,chicken sandwich,egg sandwich,shami sandwich", "piece", 340, 17, "2 slices bread + filling"],
  ["Bread slice + chicken spread", "chicken spread,bread with chicken spread,bread chicken spread", "slice", 130, 4.5, ""],
  ["Chicken pulao (plate)", "chicken pulao,pulao,pulao plate,yakhni pulao", "plate", 650, 25, "Home; restaurant ~800"],
  ["Matar pulao (plate)", "matar pulao,peas pulao,aloo matar rice,aloo matar pulao", "plate", 550, 12, ""],
  ["Chicken biryani (plate)", "biryani,chicken biryani,beef biryani", "plate", 600, 25, ""],
  ["Plain rice", "rice,chawal,boiled rice,plain rice,white rice", "cup cooked", 200, 4, ""],
  ["Dahi (yogurt)", "dahi,yogurt,yoghurt,curd", "cup", 120, 7, "Full fat, 200 g"],
  ["Raita", "raita", "bowl", 90, 4, ""],
  ["Salad", "salad,kachumar,cucumber salad", "plate", 40, 1, "No dressing"],
  ["Milk, buffalo", "milk,doodh,buffalo milk,glass of milk", "glass", 240, 9, "250 ml"],
  ["Banana", "banana,kela,kelay", "piece", 105, 1, ""],
  ["Apple", "apple,saib,seb", "piece", 95, 0.5, ""],
  ["Apple slice", "apple slice,apple slices", "slice", 12, 0, ""],
  ["Guava (amrood)", "guava,amrood,amrud", "piece", 70, 2.5, "Medium"],
  ["Pomegranate seeds (anaar)", "anaar,anar,pomegranate", "cup", 75, 1.5, ""],
  ["Papaya", "papaya,papita", "cup", 60, 0.7, "Cubes"],
  ["Orange / kinnow", "orange,kinnow,kinno,malta", "piece", 60, 1, ""],
  ["Grapes", "grapes,angoor,grape", "piece", 3, 0, "Per grape"],
  ["Cucumber", "cucumber,kheera,kheere", "piece", 15, 0.7, ""],
  ["Dates (khajoor)", "dates,khajoor,khajur", "piece", 65, 0.5, ""],
  ["Almonds (badam)", "almonds,badam,almond", "piece", 7, 0.25, ""],
  ["Ice cream (scoop)", "ice cream,icecream,chaman ice cream,scoop ice cream", "scoop", 170, 3, ""],
  ["Samosa (aloo)", "samosa,samosay", "piece", 260, 4, "Fried"],
  ["Pakora", "pakora,pakoray,pakoda", "100 g", 300, 6, "Fried"],
  ["Tea biscuit", "biscuit,biscuits,cookie,cookies", "piece", 35, 0.5, ""],
  ["Honey", "honey,shehad", "tsp", 21, 0, ""],
  ["Sugar", "sugar,cheeni,chini", "tsp", 16, 0, ""],
  ["Desi ghee / oil", "ghee,desi ghee,oil,butter", "tsp", 40, 0, ""],
];

export function migrate(db) {
  db.exec(SCHEMA);
  // columns added after the first release
  const cols = db.prepare("PRAGMA table_info(profile)").all().map((c) => c.name);
  if (!cols.includes("voice_language")) db.exec("ALTER TABLE profile ADD COLUMN voice_language TEXT NOT NULL DEFAULT 'en'");
  if (!cols.includes("base_steps")) db.exec("ALTER TABLE profile ADD COLUMN base_steps INTEGER NOT NULL DEFAULT 3000");
  if (!cols.includes("food_context")) db.exec("ALTER TABLE profile ADD COLUMN food_context TEXT");
  for (const [c, t] of [["next_milestone_weight", "REAL"], ["next_milestone_date", "TEXT"], ["next_milestone_label", "TEXT"]]) {
    if (!cols.includes(c)) db.exec(`ALTER TABLE profile ADD COLUMN ${c} ${t}`);
  }
  const hasProfile = db.prepare("SELECT 1 FROM profile WHERE id = 1").get();
  if (!hasProfile) {
    const cols = Object.keys(PROFILE_SEED);
    db.prepare(
      `INSERT INTO profile (id, ${cols.join(",")}) VALUES (1, ${cols.map((c) => "@" + c).join(",")})`,
    ).run(PROFILE_SEED);
  }
  const foodCount = db.prepare("SELECT COUNT(*) n FROM foods").get().n;
  if (foodCount === 0) {
    const ins = db.prepare(
      "INSERT INTO foods (name, aliases, unit, kcal, protein, note, source) VALUES (?, ?, ?, ?, ?, ?, 'seed')",
    );
    db.transaction(() => {
      for (const [name, aliases, unit, kcal, protein, note] of FOODS_SEED) {
        ins.run(name, aliases.toLowerCase(), unit, kcal, protein, note || null);
      }
    })();
  }
}
