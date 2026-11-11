import { getMilestones, getProfile, setMilestones } from "@/lib/queries";
import { MAX_MILESTONES } from "@/lib/types";
import { numIn, validDate } from "@/lib/validate";

export async function GET() {
  return Response.json(getMilestones());
}

const bad = (error: string) => Response.json({ error }, { status: 400 });

/** Replace the whole list: { milestones: [{ label?, weight, date }] }, at most 3, each on its own date after the start. */
export async function PUT(req: Request) {
  const b = (await req.json().catch(() => null)) as { milestones?: unknown } | null;
  if (!b || !Array.isArray(b.milestones)) return bad("milestones must be a list");
  if (b.milestones.length > MAX_MILESTONES) return bad(`at most ${MAX_MILESTONES} milestones`);
  const start = getProfile().start_date;
  const list: { label: string | null; weight: number; date: string }[] = [];
  for (const [i, raw] of b.milestones.entries()) {
    const m = (raw ?? {}) as Record<string, unknown>;
    const n = `milestone ${i + 1}`;
    const weight = numIn(m.weight, 30, 300);
    if (weight === undefined) return bad(`${n}: weight must be between 30 and 300 kg`);
    if (!validDate(m.date, { future: true })) return bad(`${n}: date must be a date (YYYY-MM-DD)`);
    if (m.date <= start) return bad(`${n}: date must be after your start date (${start})`);
    const label = typeof m.label === "string" && m.label.trim() ? m.label.trim().slice(0, 60) : null;
    list.push({ label, weight, date: m.date });
  }
  list.sort((a, c) => a.date.localeCompare(c.date));
  if (list.some((m, i) => i > 0 && m.date === list[i - 1].date)) return bad("two milestones can't share a date");
  setMilestones(list);
  return Response.json({ ok: true });
}
