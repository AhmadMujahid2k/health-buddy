import { db } from "@/lib/db";
import { addEntry, upsertDay } from "@/lib/queries";
import { cleanItems, cleanStats, toMeal, validDate } from "@/lib/validate";
import type { DraftItem, Meal } from "@/lib/types";

/** Save a whole day at once: meals + body/activity, in one transaction. */
export async function POST(req: Request) {
  const b = (await req.json()) as {
    date: string;
    source?: string;
    entries?: { meal: string; raw_text?: string; items: unknown }[];
    stats?: Record<string, unknown>;
  };
  if (!validDate(b.date)) return Response.json({ error: "bad date (YYYY-MM-DD, not in the future)" }, { status: 400 });
  const entries: { meal: Meal; raw_text: string; items: DraftItem[] }[] = [];
  for (const e of b.entries ?? []) {
    const meal = toMeal(e.meal);
    const items = cleanItems(e.items);
    if (!meal || !items) return Response.json({ error: `bad entry: ${JSON.stringify(e.meal)}` }, { status: 400 });
    if (items.length) entries.push({ meal, raw_text: String(e.raw_text ?? ""), items });
  }
  const patch = cleanStats(b.stats, false);
  if (typeof patch === "string") return Response.json({ error: patch }, { status: 400 });
  const ids: number[] = [];
  db().transaction(() => {
    for (const e of entries) ids.push(addEntry(b.date, e.meal, e.raw_text, String(b.source ?? "text"), e.items));
    if (Object.keys(patch).length) upsertDay(b.date, patch);
  })();
  return Response.json({ ok: true, entries: ids });
}
