import type { LucideIcon } from "lucide-react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`mt-0.5 text-lg font-bold tracking-tight ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function KpiCard({
  icon: Icon, label, value, sub, tone,
}: { icon: LucideIcon; label: string; value: string; sub?: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="card flex flex-col items-start gap-3 sm:flex-row sm:gap-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand sm:h-10 sm:w-10">
        <Icon size={19} />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted">{label}</div>
        <div className={`text-lg font-extrabold tracking-tight whitespace-nowrap sm:text-xl ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>
          {value}
        </div>
        {sub && <div className="truncate text-xs text-muted">{sub}</div>}
      </div>
    </div>
  );
}

export function Bar({
  label, value, max, unit, overIsBad, note,
}: { label: string; value: number; max: number; unit: string; overIsBad?: boolean; note?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = value > max;
  const color = overIsBad && over ? "bg-bad" : "bg-brand";
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="font-medium">
          {label}
          {note && <span className="ml-1.5 text-xs font-normal text-muted">{note}</span>}
        </span>
        <span className="text-muted">
          <b className="text-foreground">{Math.round(value).toLocaleString()}</b> / {max.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Donut showing calories eaten vs target, remaining in the middle. */
export function CalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, eaten / target) : 0;
  const over = eaten > target;
  const left = Math.round(target - eaten);
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          stroke={over ? "var(--bad)" : "var(--brand)"}
          strokeDasharray={`${c * pct} ${c}`}
          opacity={pct > 0 ? 1 : 0}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className={`text-2xl font-extrabold tracking-tight ${over ? "text-bad" : ""}`}>{Math.abs(left).toLocaleString()}</div>
          <div className="text-[11px] font-medium text-muted">{over ? "kcal over" : "kcal left"}</div>
        </div>
      </div>
    </div>
  );
}
