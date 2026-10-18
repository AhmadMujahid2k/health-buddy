import { upsertDay } from "@/lib/queries";

const FIELDS = ["weight", "steps", "distance_km", "active_kcal", "water_l", "sleep_h", "notes"] as const;

export async function PUT(req: Request, ctx: RouteContext<"/api/days/[date]">) {
  const { date } = await ctx.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "bad date" }, { status: 400 });
  const b = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (!(f in b)) continue;
    const v = b[f];
    patch[f] = v === "" || v == null ? null : f === "notes" ? String(v) : Number(v);
  }
  upsertDay(date, patch);
  return Response.json({ ok: true });
}
