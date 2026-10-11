import { deleteFood, upsertFood } from "@/lib/queries";

export async function PUT(req: Request, ctx: RouteContext<"/api/foods/[id]">) {
  const { id } = await ctx.params;
  const b = await req.json();
  upsertFood({
    id: Number(id),
    name: String(b.name).trim(),
    aliases: String(b.aliases ?? ""),
    unit: String(b.unit),
    kcal: Number(b.kcal) || 0,
    protein: Number(b.protein) || 0,
    note: b.note ? String(b.note) : null,
    source: b.source === "seed" || b.source === "claude" ? b.source : "user",
  });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/foods/[id]">) {
  const { id } = await ctx.params;
  deleteFood(Number(id));
  return Response.json({ ok: true });
}
