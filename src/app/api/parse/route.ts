import { estimateSections } from "@/lib/estimate";
import { extractStats, guessMealByHour, splitMeals } from "@/lib/dayparse";
import type { Meal } from "@/lib/types";

/**
 * POST { text, forceClaude?, hour? } — a whole day (or a single meal) in free text.
 * Returns per-meal items, the body/activity numbers found, and the meal sections it saw.
 */
export async function POST(req: Request) {
  const { text, forceClaude, hour } = (await req.json()) as { text: string; forceClaude?: boolean; hour?: number };
  if (!text?.trim()) return Response.json({ items: [], stats: {}, sections: [], usedClaude: false });
  const { stats, rest } = extractStats(text);
  const fallback: Meal = guessMealByHour(typeof hour === "number" ? hour : undefined);
  const sections = splitMeals(rest, fallback);
  const result = await estimateSections(sections, forceClaude);
  return Response.json({ ...result, stats, sections });
}
