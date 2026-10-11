import { addEntry } from "@/lib/queries";
import type { DraftItem, Meal } from "@/lib/types";

export async function POST(req: Request) {
  const b = (await req.json()) as { date: string; meal: Meal; raw_text: string; source?: string; items: DraftItem[] };
  if (!b.date || !b.meal || !b.items?.length) return Response.json({ error: "date, meal and items are required" }, { status: 400 });
  const id = addEntry(b.date, b.meal, b.raw_text ?? "", b.source ?? "text", b.items);
  return Response.json({ id });
}
