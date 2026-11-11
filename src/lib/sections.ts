/** Dashboard sections that can be switched off in Settings. Hidden keys are stored comma-separated in profile.hidden_sections. */
export const SECTIONS = [
  { key: "insights", label: "Insights strip" },
  { key: "events", label: "Next event" },
  { key: "ramadan", label: "Ramadan strip" },
  { key: "kpis", label: "Summary cards" },
  { key: "today", label: "Today" },
  { key: "milestone", label: "Milestone goal" },
  { key: "body", label: "Body progress" },
  { key: "realburn", label: "Real burn" },
  { key: "streaks", label: "Streaks" },
  { key: "journey", label: "Walking journey" },
  { key: "chart_weight", label: "Weight trend chart" },
  { key: "chart_calories", label: "Calories in vs out chart" },
  { key: "chart_protein", label: "Protein chart" },
  { key: "chart_steps", label: "Steps chart" },
  { key: "recent", label: "Recent days" },
  { key: "weekly", label: "Weekly summary" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

export function hiddenSections(value: string | null | undefined): Set<string> {
  return new Set((value ?? "").split(",").map((s) => s.trim()).filter(Boolean));
}

/**
 * Dashboard cards in their default order. Some cover two sections that share a row (Today & milestone, Streaks &
 * journey). The user's own order is stored comma-separated in profile.section_order.
 */
export const BLOCKS = [
  { key: "insights", label: "Insights strip" },
  { key: "ramadan", label: "Ramadan strip" },
  { key: "events", label: "Next event" },
  { key: "kpis", label: "Summary cards" },
  { key: "goal", label: "Today & milestone" },
  { key: "body", label: "Body progress" },
  { key: "realburn", label: "Real burn" },
  { key: "activity", label: "Streaks & walking journey" },
  { key: "chart_weight", label: "Weight trend chart" },
  { key: "chart_calories", label: "Calories in vs out chart" },
  { key: "chart_protein", label: "Protein chart" },
  { key: "chart_steps", label: "Steps chart" },
  { key: "recent", label: "Recent days" },
  { key: "weekly", label: "Weekly summary" },
] as const;

export type BlockKey = (typeof BLOCKS)[number]["key"];

const BLOCK_KEYS = new Set<string>(BLOCKS.map((b) => b.key));

/** The saved order, cleaned up: unknown keys dropped, duplicates removed, and any card missing from it added at the end. */
export function blockOrder(saved: string | null | undefined): BlockKey[] {
  const seen = new Set<string>();
  const out: BlockKey[] = [];
  for (const k of (saved ?? "").split(",").map((x) => x.trim())) {
    if (BLOCK_KEYS.has(k) && !seen.has(k)) { seen.add(k); out.push(k as BlockKey); }
  }
  for (const b of BLOCKS) if (!seen.has(b.key)) out.push(b.key);
  return out;
}
