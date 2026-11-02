import type { EventKind, EventRow } from "@/lib/types";
import { numIn, validDate } from "@/lib/validate";

const KINDS: EventKind[] = ["dawat", "wedding", "restaurant", "birthday", "anniversary", "other"];

/** Validates a create/update body; returns null when the name or date is missing. */
export function eventFromBody(b: Record<string, unknown>): Omit<EventRow, "id"> | null {
  const name = String(b.name ?? "").trim();
  const date = String(b.date ?? "");
  if (!name || !validDate(date, { future: true })) return null;
  return {
    name,
    date,
    kind: KINDS.includes(b.kind as EventKind) ? (b.kind as EventKind) : "other",
    yearly: b.yearly ? 1 : 0,
    target_weight: numIn(b.target_weight, 30, 300) ?? null,
    extra_kcal: numIn(b.extra_kcal, 0, 10_000) ?? null,
    bank_days: Math.round(numIn(b.bank_days, 1, 14) ?? 3),
    notes: b.notes ? String(b.notes) : null,
  };
}
