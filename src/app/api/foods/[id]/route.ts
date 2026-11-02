import { db } from "@/lib/db";
import { deleteFood, upsertFood } from "@/lib/queries";
import { numIn, toId } from "@/lib/validate";

export async function PUT(req: Request, ctx: RouteContext<"/api/foods/[id]">) {
  const id = toId((await ctx.params).id);
  if (!id) return Response.json({ error: "bad id" }, { status: 400 });
  const b = await req.json();
  const name = String(b.name ?? "").trim();
  const unit = String(b.unit ?? "").trim();
  if (!name || !unit) return Response.json({ error: "name and unit are required" }, { status: 400 });
  if (!db().prepare("SELECT 1 FROM foods WHERE id = ?").get(id)) return Response.json({ error: "not found" }, { status: 404 });
  if (db().prepare("SELECT 1 FROM foods WHERE name = ? AND id != ?").get(name, id))
    return Response.json({ error: `another food is already called "${name}"` }, { status: 409 });
  upsertFood({
    id,
    name,
    aliases: String(b.aliases ?? ""),
    unit,
    kcal: numIn(b.kcal, 0, 10_000) ?? 0,
    protein: numIn(b.protein, 0, 1_000) ?? 0,
    note: b.note ? String(b.note) : null,
    source: b.source === "seed" || b.source === "claude" ? b.source : "user",
  });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/foods/[id]">) {
  const id = toId((await ctx.params).id);
  if (!id) return Response.json({ error: "bad id" }, { status: 400 });
  deleteFood(id);
  return Response.json({ ok: true });
}
