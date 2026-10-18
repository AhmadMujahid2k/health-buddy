import { db } from "@/lib/db";
import { addEntry, upsertDay } from "@/lib/queries";
import type { DraftItem, Meal } from "@/lib/types";

const STAT_FIELDS = ["weight", "steps", "distance_km", "active_kcal", "water_l", "sleep_h", "notes"] as const;

/** Save a whole day at once: meals + body/activity, in one transaction. */
export async function POST(req: Request) {
  const b = (await req.json()) as {
    date: string;
    source?: string;
    entries: { meal: Meal; raw_text: string; items: DraftItem[] }[];
    stats?: Record<string, unknown>;
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date ?? "")) return Response.json({ error: "bad date" }, { status: 400 });
  const ids: number[] = [];
  db().transaction(() => {
    for (const e of b.entries ?? []) {
      if (e.items?.length) ids.push(addEntry(b.date, e.meal, e.raw_text ?? "", b.source ?? "text", e.items));
    }
    const patch: Record<string, unknown> = {};
    for (const f of STAT_FIELDS) {
      const v = b.stats?.[f];
      if (v === undefined || v === "") continue;
      patch[f] = v == null ? null : f === "notes" ? String(v) : Number(v);
    }
    if (Object.keys(patch).length) upsertDay(b.date, patch);
  })();
  return Response.json({ ok: true, entries: ids });
}
