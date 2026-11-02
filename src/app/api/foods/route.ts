import { getFoods, upsertFood } from "@/lib/queries";
import { db } from "@/lib/db";
import { numIn } from "@/lib/validate";

export async function GET() {
  return Response.json(getFoods());
}

export async function POST(req: Request) {
  const b = await req.json();
  const name = String(b.name ?? "").trim();
  const unit = String(b.unit ?? "").trim();
  if (!name || !unit) return Response.json({ error: "name and unit are required" }, { status: 400 });
  if (db().prepare("SELECT 1 FROM foods WHERE name = ?").get(name))
    return Response.json({ error: `"${name}" is already in the food library; edit it instead` }, { status: 409 });
  const id = upsertFood({
    name,
    aliases: String(b.aliases ?? ""),
    unit,
    kcal: numIn(b.kcal, 0, 10_000) ?? 0,
    protein: numIn(b.protein, 0, 1_000) ?? 0,
    note: b.note ? String(b.note) : null,
    source: "user",
  });
  return Response.json({ id });
}
