import { db } from "@/lib/db";
import { deleteItem } from "@/lib/queries";
import { numIn, toId } from "@/lib/validate";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/items/[id]">) {
  const id = toId((await ctx.params).id);
  if (!id) return Response.json({ error: "bad id" }, { status: 400 });
  deleteItem(id);
  return Response.json({ ok: true });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/items/[id]">) {
  const id = toId((await ctx.params).id);
  if (!id) return Response.json({ error: "bad id" }, { status: 400 });
  const b = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, string | number> = {};
  if (b.name !== undefined) {
    const name = String(b.name ?? "").trim();
    if (!name) return Response.json({ error: "name can't be empty" }, { status: 400 });
    patch.name = name;
  }
  for (const [k, max] of [["qty", 1_000], ["kcal", 10_000], ["protein", 1_000]] as const) {
    if (b[k] === undefined) continue;
    const n = numIn(b[k], 0, max);
    if (n === undefined) return Response.json({ error: `${k} must be a number from 0 to ${max}` }, { status: 400 });
    patch[k] = n;
  }
  const cols = Object.keys(patch);
  if (!cols.length) return Response.json({ ok: true });
  const { changes } = db()
    .prepare(`UPDATE entry_items SET ${cols.map((c) => `${c} = @${c}`).join(", ")}, estimated_by = 'manual' WHERE id = @id`)
    .run({ ...patch, id });
  return changes ? Response.json({ ok: true }) : Response.json({ error: "not found" }, { status: 404 });
}
