import { db } from "@/lib/db";
import { deleteItem } from "@/lib/queries";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/items/[id]">) {
  const { id } = await ctx.params;
  deleteItem(Number(id));
  return Response.json({ ok: true });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/items/[id]">) {
  const { id } = await ctx.params;
  const b = (await req.json()) as { name?: string; qty?: number; kcal?: number; protein?: number };
  const cols = (["name", "qty", "kcal", "protein"] as const).filter((k) => b[k] !== undefined);
  if (cols.length) {
    db()
      .prepare(`UPDATE entry_items SET ${cols.map((c) => `${c} = @${c}`).join(", ")}, estimated_by = 'manual' WHERE id = @id`)
      .run({ ...b, id: Number(id) });
  }
  return Response.json({ ok: true });
}
