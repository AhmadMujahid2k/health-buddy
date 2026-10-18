import type { DraftItem, Food } from "./types";

/**
 * Turn a free-text meal log ("2 roti, aloo gosht 1 bowl aur chai bina cheeni")
 * into draft items using the food table. Anything it can't match confidently is
 * returned in `unknown` so the caller can ask Claude.
 */

const NUMBER_WORDS: Record<string, number> = {
  ek: 1, aik: 1, one: 1, a: 1, an: 1,
  do: 2, two: 2, teen: 3, three: 3, char: 4, chaar: 4, four: 4,
  panch: 5, paanch: 5, five: 5, chay: 6, che: 6, six: 6,
  half: 0.5, aadha: 0.5, adha: 0.5, aadhi: 0.5, adhi: 0.5,
  dedh: 1.5, dhai: 2.5, quarter: 0.25, pao: 0.25,
};

// canonical unit → words people use
const UNIT_SYNONYMS: Record<string, string[]> = {
  piece: ["piece", "pieces", "pc", "pcs", "nos"],
  cup: ["cup", "cups", "mug", "mugs", "pyala", "pyali"],
  plate: ["plate", "plates"],
  bowl: ["bowl", "bowls", "katori", "katoris", "serving", "servings"],
  glass: ["glass", "glasses"],
  slice: ["slice", "slices"],
  scoop: ["scoop", "scoops"],
  spoon: ["spoon", "spoons", "chamch", "chamach", "chamcha", "chamchay", "tbsp", "tablespoon", "tablespoons"],
  tsp: ["tsp", "teaspoon", "teaspoons"],
  handful: ["handful", "mutthi", "muthi"],
  can: ["can", "cans", "bottle", "bottles"],
};
const UNIT_WORD = new Map<string, string>();
for (const [canon, words] of Object.entries(UNIT_SYNONYMS)) for (const w of words) UNIT_WORD.set(w, canon);

const SMALL = new Set(["small", "chota", "choti", "chotay", "chhota", "little", "thora", "thoda", "thori"]);
const BIG = new Set(["big", "bara", "bari", "baray", "large", "bada", "badi"]);

// words that carry no food meaning
const FILLER = new Set([
  "with", "without", "and", "aur", "of", "the", "ka", "ki", "ke", "kay", "wala", "wali", "wale", "walay", "waly",
  "home", "made", "homemade", "plain", "fresh", "desi", "some", "only", "just", "also", "bhi", "portion",
  "i", "had", "have", "ate", "eat", "drank", "drink", "khaya", "khayi", "khaye", "piya", "pi", "li", "liya", "lia",
  "for", "in", "at", "around", "about", "pm", "am", "then", "phir", "today", "aaj", "now", "abhi",
  "breakfast", "lunch", "dinner", "nashta", "khana", "snack", "full", "proper", "approx", "approximately",
  "like", "my", "me", "it", "is", "was", "x", "times", "bit", "kuch", "sath", "saath", "mein", "main",
  // left over after stats/meal words are removed
  "another", "more", "total", "so", "far", "skip", "skipped", "skiped", "kcal", "kcl", "cal", "calories", "calory",
  "watch", "band", "app", "km", "kms", "distance", "walked", "walk", "burn", "burnt", "burned", "steps", "step", "water", "hours", "hour", "hrs", "sleep", "slept",
  "liters", "liter", "litres", "litre", "ltr", "from", "than", "after", "before", "good", "day",
]);

const NUM_RE = /^(\d+(?:\.\d+)?)(?:\s*[-–to]+\s*(\d+(?:\.\d+)?))?$/;

export function splitMessage(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .split(/[,;\n]|\s\+\s|\s&\s|\b(?:aur|and|plus|then|phir|than|also)\b/g)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 1);
}

interface AliasHit {
  start: number;
  end: number;
  food: Food;
  alias: string;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a list of (alias, food) sorted longest first, so "chai with sugar" beats "chai". */
export function aliasIndex(foods: Food[]) {
  const list: { alias: string; food: Food; re: RegExp }[] = [];
  for (const f of foods) {
    const names = new Set([f.name.toLowerCase(), ...f.aliases.split(",").map((a) => a.trim()).filter(Boolean)]);
    for (const alias of names) {
      list.push({ alias, food: f, re: new RegExp(`(?<![a-z])${escapeRe(alias)}(?![a-z])`, "g") });
    }
  }
  return list.sort((a, b) => b.alias.length - a.alias.length);
}

function readQty(words: string[]): { qty: number | null; unit: string | null; size: number } {
  let qty: number | null = null;
  let unit: string | null = null;
  let size = 1;
  const joined = words.join(" ");
  // "1/2"
  const frac = joined.match(/(\d+)\s*\/\s*(\d+)/);
  if (frac) qty = Number(frac[1]) / Number(frac[2]);
  for (const w of words) {
    const m = w.match(NUM_RE);
    if (m && qty == null) qty = m[2] ? (Number(m[1]) + Number(m[2])) / 2 : Number(m[1]);
    else if (w in NUMBER_WORDS && qty == null && !(w === "a" || w === "an") ) qty = NUMBER_WORDS[w];
    else if ((w === "a" || w === "an") && qty == null) qty = 1;
    if (UNIT_WORD.has(w)) unit = UNIT_WORD.get(w)!;
    if (SMALL.has(w)) size = 0.75;
    if (BIG.has(w)) size = 1.25;
  }
  // "4-5" written without spaces is one word and handled above; "4 - 5" splits into tokens
  const range = joined.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (range) qty = (Number(range[1]) + Number(range[2])) / 2;
  return { qty, unit, size };
}

function canonicalFoodUnit(unit: string): string | null {
  for (const w of unit.toLowerCase().split(/[^a-z]+/)) if (UNIT_WORD.has(w)) return UNIT_WORD.get(w)!;
  return null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function parseWithTable(text: string, foods: Food[]) {
  const idx = aliasIndex(foods);
  const items: DraftItem[] = [];
  const unknown: string[] = [];

  for (const chunk of splitMessage(text)) {
    // 1. find non-overlapping alias hits, longest first
    const hits: AliasHit[] = [];
    const taken = new Array(chunk.length).fill(false);
    for (const { alias, food, re } of idx) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(chunk))) {
        const s = m.index, e = s + alias.length;
        if (taken.slice(s, e).some(Boolean)) continue;
        for (let i = s; i < e; i++) taken[i] = true;
        hits.push({ start: s, end: e, food, alias });
      }
    }
    hits.sort((a, b) => a.start - b.start);

    if (!hits.length) {
      const words = chunk.split(/[^a-z0-9.\-/]+/).filter(Boolean);
      const meaningful = words.filter((w) => !FILLER.has(w) && !UNIT_WORD.has(w) && !NUM_RE.test(w) && w.length > 2);
      if (meaningful.length) unknown.push(chunk);
      continue;
    }

    // 2. each hit owns the words between the previous hit and the next one
    let leftover: string[] = [];
    const chunkItems: DraftItem[] = [];
    let needsClaude = false;
    hits.forEach((h, i) => {
      const before = chunk.slice(i === 0 ? 0 : hits[i - 1].end, h.start);
      const after = i === hits.length - 1 ? chunk.slice(h.end) : "";
      const words = (before + " " + after).split(/[^a-z0-9.\-/]+/).filter(Boolean);
      const { qty, unit, size } = readQty(words);
      const foodUnit = canonicalFoodUnit(h.food.unit);
      if (unit && unit !== foodUnit) needsClaude = true; // "4 spoons rice" vs rice per cup
      const q = (qty ?? 1) * size;
      chunkItems.push({
        name: h.food.name,
        qty: round1(q),
        unit: h.food.unit,
        kcal: Math.round(h.food.kcal * q),
        protein: round1(h.food.protein * q),
        food_id: h.food.id,
        estimated_by: "table",
        text: chunk,
      });
      leftover.push(
        ...words.filter(
          (w) =>
            !FILLER.has(w) && !UNIT_WORD.has(w) && !SMALL.has(w) && !BIG.has(w) &&
            !(w in NUMBER_WORDS) && !NUM_RE.test(w) && !/^\d/.test(w) && w.length > 2,
        ),
      );
    });

    if (needsClaude) {
      unknown.push(chunk);
      continue;
    }
    items.push(...chunkItems);
    // drop words that already belong to a matched food ("chicken" in "boti of desi chicken" → Chicken boti)
    const covered = hits.map((h) => `${h.food.name} ${h.food.aliases}`.toLowerCase()).join(" ");
    leftover = [...new Set(leftover)].filter((w) => !covered.includes(w) && !["bar", "bbq"].includes(w));
    // words we couldn't place (e.g. "shorba" in "2 mutton boti with shorba") → ask Claude about just those,
    // telling it what's already counted so it doesn't count the same food twice
    if (leftover.length) {
      unknown.push(`"${chunk}" (already counted: ${chunkItems.map((i) => i.name).join(", ")}; extra words: ${leftover.join(" ")})`);
    }
  }
  return { items, unknown };
}
