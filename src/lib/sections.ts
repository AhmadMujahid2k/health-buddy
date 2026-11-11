/**
 * Dashboard sections that can be switched off in Settings, in their default dashboard order. Hidden keys are stored
 * comma-separated in profile.hidden_sections. `block` is the card a section lives in for ordering: most are their own
 * card, but Today & milestone and Streaks & journey share a row, so each pair moves as one card.
 */
export const SECTIONS = [
  { key: "insights", label: "Insights strip", block: "insights" },
  { key: "ramadan", label: "Ramadan strip", block: "ramadan" },
  { key: "events", label: "Next event", block: "events" },
  { key: "kpis", label: "Summary cards", block: "kpis" },
  { key: "today", label: "Today", block: "goal" },
  { key: "milestone", label: "Milestone goal", block: "goal" },
  { key: "body", label: "Body progress", block: "body" },
  { key: "realburn", label: "Real burn", block: "realburn" },
  { key: "streaks", label: "Streaks", block: "activity" },
  { key: "journey", label: "Walking journey", block: "activity" },
  { key: "chart_weight", label: "Weight trend chart", block: "chart_weight" },
  { key: "chart_calories", label: "Calories in vs out chart", block: "chart_calories" },
  { key: "chart_protein", label: "Protein chart", block: "chart_protein" },
  { key: "chart_steps", label: "Steps chart", block: "chart_steps" },
  { key: "recent", label: "Recent days", block: "recent" },
  { key: "weekly", label: "Weekly summary", block: "weekly" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

export function hiddenSections(value: string | null | undefined): Set<string> {
  return new Set((value ?? "").split(",").map((s) => s.trim()).filter(Boolean));
}

export type BlockKey = (typeof SECTIONS)[number]["block"];

/** Names for cards that hold two sections; single-section cards use the section's label. */
const PAIR_LABELS: Partial<Record<BlockKey, string>> = { goal: "Today & milestone", activity: "Streaks & walking journey" };

/** Dashboard cards in their default order, derived from SECTIONS. The user's order is stored in profile.section_order. */
export const BLOCKS: { key: BlockKey; label: string }[] = SECTIONS.filter(
  (s, i) => SECTIONS.findIndex((t) => t.block === s.block) === i,
).map((s) => ({ key: s.block, label: PAIR_LABELS[s.block] ?? s.label }));

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
