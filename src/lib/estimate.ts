import "server-only";
import { parseWithTable } from "./parse";
import { estimateWithClaude } from "./claude";
import { findFoodByAlias, getFoods, getProfile, upsertFood } from "./queries";
import type { DraftItem, Meal } from "./types";
import { MEALS } from "./types";

export type MealDraftItem = DraftItem & { meal: Meal };

/**
 * Estimate foods for one or more meal sections: food table first, then a single
 * Claude call for everything the table didn't know. New Claude foods are saved to the table.
 */
export async function estimateSections(sections: { meal: Meal; text: string }[], forceClaude = false) {
  const foods = getFoods();
  const items: MealDraftItem[] = [];
  const unknown: { meal: Meal; text: string }[] = [];

  for (const sec of sections) {
    if (forceClaude) {
      unknown.push(sec);
      continue;
    }
    const parsed = parseWithTable(sec.text, foods);
    items.push(...parsed.items.map((i) => ({ ...i, meal: sec.meal })));
    unknown.push(...parsed.unknown.map((text) => ({ meal: sec.meal, text })));
  }

  let claudeError: string | null = null;
  if (unknown.length) {
    const tagged = unknown.map((u) => `[${u.meal}] ${u.text}`);
    try {
      const prof = getProfile();
      const est = await estimateWithClaude(tagged, prof.claude_model, prof.food_context);
      for (const it of est) {
        const meal: Meal = (MEALS as string[]).includes(it.meal) ? (it.meal as Meal) : unknown[0].meal;
        const { alias, kcal_per_unit, protein_per_unit, meal: _m, ...draft } = it;
        // already known under this name/alias: don't add a clashing food
        const known = findFoodByAlias(alias) ?? findFoodByAlias(it.name);
        const food_id =
          known?.id ??
          upsertFood({
            name: it.name, aliases: alias, unit: it.unit, kcal: kcal_per_unit, protein: protein_per_unit,
            note: "Estimated by Claude", source: "claude",
          });
        items.push({ ...draft, food_id, meal });
      }
    } catch (e) {
      claudeError = (e as Error).message;
      for (const u of unknown) {
        items.push({ name: u.text, qty: 1, unit: "serving", kcal: 0, protein: 0, food_id: null, estimated_by: "manual", text: u.text, meal: u.meal });
      }
    }
  }
  // keep the order of the day
  const order = new Map(MEALS.map((m, i) => [m, i]));
  items.sort((a, b) => (order.get(a.meal) ?? 9) - (order.get(b.meal) ?? 9));
  return { items, usedClaude: unknown.length > 0, unknown: unknown.map((u) => u.text), claudeError };
}
