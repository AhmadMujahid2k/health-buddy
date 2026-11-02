import { deleteEvent, upsertEvent } from "@/lib/queries";
import { eventFromBody } from "../body";
import { toId } from "@/lib/validate";

export async function PUT(req: Request, ctx: RouteContext<"/api/events/[id]">) {
  const id = toId((await ctx.params).id);
  if (!id) return Response.json({ error: "bad id" }, { status: 400 });
  const e = eventFromBody(await req.json());
  if (!e) return Response.json({ error: "name and date (YYYY-MM-DD) are required" }, { status: 400 });
  upsertEvent({ ...e, id });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/events/[id]">) {
  const id = toId((await ctx.params).id);
  if (!id) return Response.json({ error: "bad id" }, { status: 400 });
  deleteEvent(id);
  return Response.json({ ok: true });
}
