// Neutral mark that sits on every palette: a heart with a pulse line on a rounded tile.
// "light" = white tile (for dark backgrounds, like the sidebar); "dark" = ink tile (for light backgrounds).
const INK = "#111827";
const HEART = "M32 50 C14 38 10 29 10 22.5 C10 16 15 11.5 21 11.5 C25.5 11.5 29.5 14 32 18 C34.5 14 38.5 11.5 43 11.5 C49 11.5 54 16 54 22.5 C54 29 50 38 32 50 Z";
const PULSE = "M15 30 H24 L27.5 23 L32 37 L36 27 L38.5 30 H49";

export function LogoMark({ size = 32, variant = "light" }: { size?: number; variant?: "light" | "dark" }) {
  const tile = variant === "light" ? "#ffffff" : INK;
  const heart = variant === "light" ? INK : "#ffffff";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill={tile} />
      <path d={HEART} fill={heart} />
      <path d={PULSE} fill="none" stroke={tile} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[17px] font-extrabold tracking-tight text-sidebar-strong">
        Health<span className="font-semibold text-sidebar-text">Buddy</span>
      </span>
    </span>
  );
}
