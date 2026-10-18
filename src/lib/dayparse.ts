import type { Meal } from "./types";

/**
 * Whole-day log → body stats + per-meal text.
 * "weight 82.5, breakfast 2 eggs chai, lunch skip, dinner 2 roti karahi, 7k steps 350 kcal burnt"
 */

export interface DayStatsDraft {
  weight?: number;
  steps?: number;
  distance_km?: number;
  active_kcal?: number;
  water_l?: number;
  sleep_h?: number;
}

export interface MealSection {
  meal: Meal;
  text: string;
}

const num = (s: string) => Number(s.replace(",", "."));
const avg = (a: string, b?: string) => (b ? (num(a) + num(b)) / 2 : num(a));
const N = String.raw`(\d+(?:[.,]\d+)?)(?:\s*(?:-|to)\s*(\d+(?:[.,]\d+)?))?`; // "7", "7.5", "7-8", "2 to 3"

const STAT_PATTERNS: { key: keyof DayStatsDraft; re: RegExp; read: (m: RegExpMatchArray) => number }[] = [
  // weight: "82.5 kg", "weight 82.45", "weight is 83"
  { key: "weight", re: /(?:weight|wazan|weighed)\s*(?:is|was|:|=|of)?\s*(\d{2,3}(?:[.,]\d{1,2})?)\s*(?:kgs?|kilos?)?/i, read: (m) => num(m[1]) },
  { key: "weight", re: /(\d{2,3}(?:[.,]\d{1,2})?)\s*(?:kgs?|kilos?)\b/i, read: (m) => num(m[1]) },
  // steps: "7k steps", "7,500 steps", "steps 7k", "total steps 6k"
  { key: "steps", re: /(\d+(?:[.,]\d+)?)\s*(k)?\s*steps?\b/i, read: (m) => Math.round(num(m[1].replace(",", "")) * (m[2] ? 1000 : 1)) },
  { key: "steps", re: /steps?\s*(?:were|was|is|:|=)?\s*(\d+(?:[.,]\d+)?)\s*(k)?/i, read: (m) => Math.round(num(m[1]) * (m[2] ? 1000 : 1)) },
  // distance: "7.48 km", "walked 5km"
  { key: "distance_km", re: /(\d+(?:[.,]\d+)?)\s*(?:km|kms|kilomet(?:er|re)s?)\b/i, read: (m) => num(m[1]) },
  // watch kcal: "350 kcal burnt", "345kcal from watch", "burnt 300 calories"
  {
    key: "active_kcal",
    re: /(\d{2,4})\s*(?:kcal|kcl|cal|calories?|calory|claories)\b[^.,;\n]{0,30}?(?:burn|burnt|burned|watch|band|app)/i,
    read: (m) => num(m[1]),
  },
  { key: "active_kcal", re: /(?:burn|burnt|burned)\D{0,20}?(\d{2,4})\s*(?:kcal|kcl|cal|calories?)?/i, read: (m) => num(m[1]) },
  { key: "active_kcal", re: /(?:kcal|kcl|calories?)\s*(?:burn|burnt|burned)?\s*(?:from\s*)?(?:the\s*)?(?:watch|band|app)\s*(?:is|was|:|=)?\s*(\d{2,4})/i, read: (m) => num(m[1]) },
  // water: "2-3 liters water", "water 3l", "drank 2.5 litre"
  { key: "water_l", re: new RegExp(String.raw`${N}\s*(?:l|ltr|liters?|litres?)\b(?:\s*(?:of\s*)?water)?`, "i"), read: (m) => avg(m[1], m[2]) },
  { key: "water_l", re: new RegExp(String.raw`water\s*(?:was|:|=)?\s*${N}\s*(?:l|ltr|liters?|litres?)?`, "i"), read: (m) => avg(m[1], m[2]) },
  // sleep: "slept 7 hours", "sleep 7-8 hours", "7h sleep"
  { key: "sleep_h", re: new RegExp(String.raw`(?:slept|sleep|soya|soye|neend)\D{0,12}?${N}\s*(?:hours?|hrs?|ghante|h\b)?`, "i"), read: (m) => avg(m[1], m[2]) },
  { key: "sleep_h", re: new RegExp(String.raw`${N}\s*(?:hours?|hrs?|ghante|h)\b\s*(?:of\s*)?(?:sleep|neend)`, "i"), read: (m) => avg(m[1], m[2]) },
];

export function extractStats(text: string): { stats: DayStatsDraft; rest: string } {
  const stats: DayStatsDraft = {};
  let rest = text;
  for (const { key, re, read } of STAT_PATTERNS) {
    if (stats[key] != null) continue;
    const m = rest.match(re);
    if (!m) continue;
    const v = read(m);
    if (!Number.isFinite(v)) continue;
    if (key === "weight" && (v < 30 || v > 300)) continue;
    stats[key] = v;
    rest = rest.replace(m[0], " , ");
  }
  return { stats, rest };
}

// Section markers. Order matters: more specific first.
const MARKERS: { meal: Meal; re: RegExp }[] = [
  { meal: "breakfast", re: /\b(?:break\s?fast|brekfast|breakfst|nashta|nashtay|morning)\b/gi },
  { meal: "lunch", re: /\b(?:lunch|lanch|dopahar)\b/gi },
  { meal: "dinner", re: /\b(?:dinner|diner|dinnr|supper|raat ka khana)\b/gi },
  { meal: "snack", re: /\b(?:snacks?|evening|tea\s?time|later at night|at night|night|\d{1,2}\s*(?:-\s*\d{1,2}\s*)?pm)\b/gi },
];

const SKIP = /\b(?:skip|skipped|skiped|nothing|no lunch|no breakfast|no dinner|didn'?t eat|did not eat)\b/i;

export function splitMeals(text: string, fallback: Meal): MealSection[] {
  const marks: { at: number; end: number; meal: Meal }[] = [];
  for (const { meal, re } of MARKERS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) marks.push({ at: m.index, end: m.index + m[0].length, meal });
  }
  marks.sort((a, b) => a.at - b.at);
  // drop markers overlapping an earlier one, and times right after a meal word ("dinner at 8 pm")
  const clean: typeof marks = [];
  for (const m of marks) {
    const prev = clean.at(-1);
    if (prev && m.at < prev.end) continue;
    const isTime = /\d\s*(?:-\s*\d{1,2}\s*)?pm$/i.test(text.slice(m.at, m.end));
    // "dinner at 8 pm" → just the dinner time; "skip lunch.\n around 4pm tea" → a new snack section
    if (prev && isTime && /^[ \t:]*(?:at|around|@|~)?[ \t]*$/i.test(text.slice(prev.end, m.at))) continue;
    clean.push(m);
  }

  const sections: MealSection[] = [];
  const push = (meal: Meal, chunk: string) => {
    const t = chunk
      .replace(/^[\s:,.\-–>]+|[\s,.\-–]+$/g, "")
      .replace(/\b(?:in|for|at|around|then|than|and|i had|had)\s*$/i, "")
      .trim();
    if (!t || (SKIP.test(t) && t.split(/\s+/).length <= 4)) return;
    // nothing food-like left (e.g. "at 5 am", "today")
    const residue = t
      .replace(/\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, " ")
      .replace(/\b(?:at|around|on|today|aaj|i|had|the|my|a|was|is|it|oct\w*|nov\w*|dec\w*|time|now|so far|abhi)\b|\d+/gi, " ");
    if (!/[a-z]{3,}/i.test(residue)) return;
    const prev = sections.find((s) => s.meal === meal);
    if (prev) prev.text += ", " + t;
    else sections.push({ meal, text: t });
  };

  if (!clean.length) {
    push(fallback, text);
    return sections;
  }
  push(fallback, text.slice(0, clean[0].at));
  clean.forEach((m, i) => push(m.meal, text.slice(m.end, i + 1 < clean.length ? clean[i + 1].at : undefined)));
  return sections;
}

export function guessMealByHour(h = new Date().getHours()): Meal {
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 19) return "snack";
  return "dinner";
}
