import { getMilestones, getProfile, setMilestones } from "@/lib/queries";
import { cleanMilestones } from "@/lib/milestones";

export async function GET() {
  return Response.json(getMilestones());
}

/** Replace the whole list: { milestones: [{ label?, weight, date }] }, at most 3, each on its own date after the start. */
export async function PUT(req: Request) {
  const b = (await req.json().catch(() => null)) as { milestones?: unknown } | null;
  const list = cleanMilestones(b?.milestones, getProfile().start_date);
  if (typeof list === "string") return Response.json({ error: list }, { status: 400 });
  setMilestones(list);
  return Response.json({ ok: true });
}
