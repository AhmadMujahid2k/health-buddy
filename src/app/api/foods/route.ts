import { getFoods, upsertFood } from "@/lib/queries";

export async function GET() {
  return Response.json(getFoods());
}

export async function POST(req: Request) {
  const b = await req.json();
  if (!b.name || !b.unit) return Response.json({ error: "name and unit are required" }, { status: 400 });
  const id = upsertFood({
    name: String(b.name).trim(),
    aliases: String(b.aliases ?? ""),
    unit: String(b.unit),
    kcal: Number(b.kcal) || 0,
    protein: Number(b.protein) || 0,
    note: b.note ? String(b.note) : null,
    source: "user",
  });
  return Response.json({ id });
}
