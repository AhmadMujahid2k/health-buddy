import { MAX_MILESTONES, type MilestoneRow } from "./types";
import { numIn, validDate } from "./validate";

export type MilestoneInput = Omit<MilestoneRow, "id">;

/**
 * Check a whole milestone list from a request: at most 3, each with a weight of 30–300 kg and its own date after
 * `startDate`. Returns the list sorted by date, or the reason it was rejected.
 */
export function cleanMilestones(raw: unknown, startDate: string): MilestoneInput[] | string {
  if (!Array.isArray(raw)) return "milestones must be a list";
  if (raw.length > MAX_MILESTONES) return `at most ${MAX_MILESTONES} milestones`;
  const list: MilestoneInput[] = [];
  for (const [i, item] of raw.entries()) {
    const m = (item ?? {}) as Record<string, unknown>;
    const n = `milestone ${i + 1}`;
    const weight = numIn(m.weight, 30, 300);
    if (weight === undefined) return `${n}: weight must be between 30 and 300 kg`;
    if (!validDate(m.date, { future: true })) return `${n}: date must be a date (YYYY-MM-DD)`;
    if (m.date <= startDate) return `${n}: date must be after your start date (${startDate})`;
    const label = typeof m.label === "string" && m.label.trim() ? m.label.trim().slice(0, 60) : null;
    list.push({ label, weight, date: m.date });
  }
  list.sort((a, b) => a.date.localeCompare(b.date));
  if (list.some((m, i) => i > 0 && m.date === list[i - 1].date)) return "two milestones can't share a date";
  return list;
}
