import { deleteEntry } from "@/lib/queries";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/entries/[id]">) {
  const { id } = await ctx.params;
  deleteEntry(Number(id));
  return Response.json({ ok: true });
}
