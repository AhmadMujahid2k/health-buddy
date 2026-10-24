"use client";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark" | "system";
const KEY = "hb-theme";
const PALETTE_KEY = "hb-palette";

/** Colour palettes defined in globals.css (<html data-palette>). Swatches are the palette's source colours. */
export const PALETTES = [
  { id: "navy", label: "Navy & Cream", swatch: ["#010736", "#0d1c42", "#22396f", "#fcf1d0"] },
  { id: "indigo", label: "Electric Indigo", swatch: ["#2f2fe4", "#162e93", "#1a1953", "#080616"] },
  { id: "crimson", label: "Crimson Black", swatch: ["#000000", "#830000", "#bc0202", "#ff0000"] },
  { id: "sky", label: "Sky & Mint", swatch: ["#30afff", "#92eeff", "#d8ffc5", "#c4f7ca"] },
  { id: "ocean", label: "Ocean Blue", swatch: ["#e3f2fd", "#90caf9", "#2196f3", "#0d47a1"] },
] as const;
type PaletteId = (typeof PALETTES)[number]["id"];

/** Runs before first paint (see layout.tsx) so the saved theme and palette never flash. */
export const themeBootScript = `try{var d=document.documentElement,t=localStorage.getItem("${KEY}"),p=localStorage.getItem("${PALETTE_KEY}");if(t==="light"||t==="dark")d.dataset.theme=t;if(p&&/^(${"navy|indigo|crimson|sky|ocean"})$/.test(p))d.dataset.palette=p}catch(e){}`;

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
            theme === value ? "bg-sidebar-active text-sidebar-strong" : "text-sidebar-text hover:bg-sidebar-line hover:text-sidebar-strong"
          }`}
        >
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  );
}

/** Palette swatches: tap one to recolour the whole app. */
export function PalettePicker() {
  const [palette, setPalette] = useState<PaletteId>("navy");

  useEffect(() => {
    try {
      const p = localStorage.getItem(PALETTE_KEY);
      if (PALETTES.some((x) => x.id === p)) setPalette(p as PaletteId);
    } catch {}
  }, []);

  function choose(p: PaletteId) {
    setPalette(p);
    document.documentElement.dataset.palette = p;
    try {
      localStorage.setItem(PALETTE_KEY, p);
    } catch {}
  }

  const current = PALETTES.find((x) => x.id === palette)!;
  return (
    <div className="rounded-xl border border-sidebar-line bg-sidebar-line/40 p-2.5">
      <div className="mb-2 flex items-center justify-between px-0.5 text-[11px]">
        <span className="font-semibold text-sidebar-strong">Colours</span>
        <span className="text-sidebar-text">{current.label}</span>
      </div>
      <div role="radiogroup" aria-label="Colour palette" className="grid grid-cols-5 gap-1.5">
        {PALETTES.map((x) => (
          <button
            key={x.id}
            role="radio"
            aria-checked={palette === x.id}
            aria-label={x.label}
            title={x.label}
            onClick={() => choose(x.id)}
            className={`grid aspect-square grid-cols-2 overflow-hidden rounded-lg ring-2 transition ${
              palette === x.id ? "ring-sidebar-accent" : "ring-transparent hover:ring-sidebar-line"
            }`}
          >
            {x.swatch.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}
