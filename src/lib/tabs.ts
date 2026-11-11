/** Sidebar tabs. The optional ones can be switched off in Settings; their keys are stored in profile.hidden_tabs. */
export const TABS = [
  { key: "dashboard", href: "/", label: "Dashboard", optional: false },
  { key: "log", href: "/log", label: "Log food", optional: false },
  { key: "history", href: "/history", label: "History", optional: true },
  { key: "strength", href: "/strength", label: "Strength", optional: true },
  { key: "events", href: "/events", label: "Events", optional: true },
  { key: "ramadan", href: "/ramadan", label: "Ramadan", optional: true },
  { key: "foods", href: "/foods", label: "Food library", optional: true },
  { key: "settings", href: "/settings", label: "Settings", optional: false },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

export const OPTIONAL_TABS = TABS.filter((t) => t.optional);
