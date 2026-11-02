import { upsertDay } from "@/lib/queries";
import { cleanStats, validDate } from "@/lib/validate";

export async function PUT(req: Request, ctx: RouteContext<"/api/days/[date]">) {
  const { date } = await ctx.params;
  if (!validDate(date)) return Response.json({ error: "bad date" }, { status: 400 });
  const patch = cleanStats((await req.json()) as Record<string, unknown>, true);
  if (typeof patch === "string") return Response.json({ error: patch }, { status: 400 });
  upsertDay(date, patch);
  return Response.json({ ok: true });
}
