import type { Streak } from "@/lib/insights";

/** Streak badges: the emoji flickers while a streak is alive. */
export function Streaks({ items }: { items: Streak[] }) {
  return (
    <section className="card">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-bold">Streaks</h2>
        <span className="text-xs text-muted">days in a row</span>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {items.map((s) => {
          const alive = s.current > 0;
          return (
            <li key={s.key} className="rounded-xl border border-line bg-card-2 p-3">
              <div className="flex items-center gap-2">
                <span className={`text-2xl ${alive ? "hb-flicker" : "opacity-30 grayscale"}`} aria-hidden>
                  {s.emoji}
                </span>
                <span className={`text-2xl font-extrabold tabular-nums ${alive ? "" : "text-muted"}`}>{s.current}</span>
              </div>
              <div className="mt-1 text-xs font-medium">{s.label}</div>
              <div className="text-[11px] text-muted">best {s.best}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
