"use client";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark" | "system";
const KEY = "hb-theme";

/** Runs before first paint (see layout.tsx) so the saved theme never flashes. */
export const themeBootScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function apply(t: Theme) {
  if (t === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const t = localStorage.getItem(KEY);
      if (t === "light" || t === "dark") setTheme(t);
    } catch {}
  }, []);

  function choose(t: Theme) {
    setTheme(t);
    apply(t);
    try {
      if (t === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch {}
  }

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-xl border border-sidebar-line bg-sidebar-line/40 p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          onClick={() => choose(value)}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
            theme === value ? "bg-brand text-white" : "text-sidebar-text hover:bg-sidebar-line hover:text-white"
          }`}
        >
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  );
}
