/** Dashboard sections that can be switched off in Settings. Hidden keys are stored comma-separated in profile.hidden_sections. */
export const SECTIONS = [
  { key: "insights", label: "Insights strip" },
  { key: "events", label: "Next event" },
  { key: "kpis", label: "Summary cards" },
  { key: "today", label: "Today" },
  { key: "milestone", label: "Milestone goal" },
  { key: "realburn", label: "Real burn" },
  { key: "streaks", label: "Streaks" },
  { key: "journey", label: "Walking journey" },
  { key: "chart_weight", label: "Weight trend chart" },
  { key: "chart_calories", label: "Calories in vs out chart" },
  { key: "chart_protein", label: "Protein chart" },
  { key: "chart_steps", label: "Steps chart" },
  { key: "weekly", label: "Weekly summary" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

export function hiddenSections(value: string | null | undefined): Set<string> {
  return new Set((value ?? "").split(",").map((s) => s.trim()).filter(Boolean));
}
