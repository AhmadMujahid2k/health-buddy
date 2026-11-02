import { addEntry } from "@/lib/queries";
import { cleanItems, toMeal, validDate } from "@/lib/validate";

export async function POST(req: Request) {
  const b = (await req.json()) as Record<string, unknown>;
  const meal = toMeal(b.meal);
  const items = cleanItems(b.items);
  if (!validDate(b.date) || !meal || !items?.length)
    return Response.json({ error: "a valid date, meal and items are required" }, { status: 400 });
  const id = addEntry(b.date, meal, String(b.raw_text ?? ""), String(b.source ?? "text"), items);
  return Response.json({ id });
}
