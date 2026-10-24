"use client";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/** One insight at a time, rotating every few seconds (pauses while hovered). */
export function InsightsTicker({ items, every = 6000 }: { items: string[]; every?: number }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || items.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % items.length), every);
    return () => clearInterval(id);
  }, [paused, items.length, every]);
  if (!items.length) return null;

  return (
    <section
      className="card flex items-center gap-3 overflow-hidden py-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
        <Sparkles size={16} />
      </span>
      <p key={i} className="hb-fade-in line-clamp-2 min-w-0 flex-1 text-sm font-medium sm:truncate" title={items[i]}>
        {items[i]}
      </p>
      <div className="hidden shrink-0 gap-1 sm:flex">
        {items.map((_, n) => (
          <button
            key={n}
            aria-label={`Show insight ${n + 1}`}
            onClick={() => setI(n)}
            className={`h-1.5 rounded-full transition-all ${n === i ? "w-4 bg-brand" : "w-1.5 bg-line hover:bg-muted"}`}
          />
        ))}
      </div>
    </section>
  );
}
