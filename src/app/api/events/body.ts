import type { EventKind, EventRow } from "@/lib/types";

const KINDS: EventKind[] = ["dawat", "wedding", "restaurant", "birthday", "anniversary", "other"];
const num = (v: unknown) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));

/** Validates a create/update body; returns null when the name or date is missing. */
export function eventFromBody(b: Record<string, unknown>): Omit<EventRow, "id"> | null {
  const name = String(b.name ?? "").trim();
  const date = String(b.date ?? "");
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return {
    name,
    date,
    kind: KINDS.includes(b.kind as EventKind) ? (b.kind as EventKind) : "other",
    yearly: b.yearly ? 1 : 0,
    target_weight: num(b.target_weight),
    extra_kcal: num(b.extra_kcal),
    bank_days: Math.min(14, Math.max(1, num(b.bank_days) ?? 3)),
    notes: b.notes ? String(b.notes) : null,
  };
}
