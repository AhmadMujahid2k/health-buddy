import { deleteEvent, upsertEvent } from "@/lib/queries";
import { eventFromBody } from "../body";

export async function PUT(req: Request, ctx: RouteContext<"/api/events/[id]">) {
  const { id } = await ctx.params;
  const e = eventFromBody(await req.json());
  if (!e) return Response.json({ error: "name and date (YYYY-MM-DD) are required" }, { status: 400 });
  upsertEvent({ ...e, id: Number(id) });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/events/[id]">) {
  const { id } = await ctx.params;
  deleteEvent(Number(id));
  return Response.json({ ok: true });
}
