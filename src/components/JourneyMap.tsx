"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

type Stop = { name: string; km: number };

const ROUTE = "M34,74 C140,46 220,104 304,74 S470,44 574,72";

/** Total distance walked, drawn as a dot travelling along a route. The dot animates in on load. */
export function JourneyMap({
  name, stops, totalKm,
}: { name: string; stops: Stop[]; totalKm: number }) {
  const length = stops.at(-1)!.km;
  const lap = Math.floor(totalKm / length);
  const pos = totalKm - lap * length;
  const target = pos / length;
  const next = stops.find((s) => s.km > pos) ?? stops.at(-1)!;

  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  const [t, setT] = useState(0);

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    setLen(el.getTotalLength());
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return setT(target);
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 1800);
      setT(target * (1 - Math.pow(1 - k, 3))); // ease-out
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const at = (f: number) => pathRef.current?.getPointAtLength(f * len) ?? { x: 0, y: 0 };
  const dot = len ? at(t) : null;

  return (
    <section className="card min-w-0">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">Walking journey</h2>
        <span className="text-xs text-muted">
          {name}
          {lap > 0 && ` · lap ${lap + 1}`}
        </span>
      </div>
      <p className="text-sm text-muted">
        <b className="text-foreground">{totalKm.toFixed(1)} km</b> walked ·{" "}
        {pos < length ? <>{(next.km - pos).toFixed(1)} km to <b className="text-foreground">{next.name}</b></> : "arrived!"}
      </p>

      <div className="-mx-1 overflow-x-auto px-1">
      <svg viewBox="0 0 608 130" className="mt-2 h-auto w-full min-w-[520px]" role="img" aria-label={`${totalKm.toFixed(1)} km along ${name}`}>
        <path d={ROUTE} fill="none" stroke="var(--line)" strokeWidth={6} strokeLinecap="round" />
        <path
          ref={pathRef}
          d={ROUTE}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={len || 1}
          strokeDashoffset={len ? len * (1 - t) : 1}
        />
        {len > 0 &&
          stops.map((s, i) => {
            const p = at(s.km / length);
            const reached = s.km <= pos;
            const below = i % 2 === 1;
            const anchor = i === 0 ? "start" : i === stops.length - 1 ? "end" : "middle";
            return (
              <g key={s.name}>
                <circle cx={p.x} cy={p.y} r={5} fill={reached ? "var(--chart-1)" : "var(--card)"} stroke={reached ? "var(--chart-1)" : "var(--muted)"} strokeWidth={2} />
                <text x={i === 0 ? p.x - 8 : i === stops.length - 1 ? p.x + 8 : p.x} y={below ? p.y + 24 : p.y - 14} textAnchor={anchor} fontSize={11} fill={reached ? "var(--foreground)" : "var(--muted)"} fontWeight={reached ? 700 : 500}>
                  {s.name}
                </text>
              </g>
            );
          })}
        {dot && (
          <g transform={`translate(${dot.x} ${dot.y})`}>
            <circle r={14} fill="var(--chart-2)" opacity={0.2} className="hb-pulse" />
            <circle r={8} fill="var(--chart-2)" stroke="var(--card)" strokeWidth={2.5} />
          </g>
        )}
      </svg>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
        <MapPin size={12} /> Road distances are approximate
      </div>
    </section>
  );
}
