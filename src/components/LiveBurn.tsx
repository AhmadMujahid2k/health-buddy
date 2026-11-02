"use client";
import { useEffect, useState } from "react";
import { Clock, Flame } from "lucide-react";

const toMin = (hhmm: string | null) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

const dur = (min: number) => {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

/** Calories burned since midnight, ticking every second, plus where you are in your eating window. */
export function LiveBurn({
  baseBurn, activeCounted, intake, eatStart, eatEnd,
}: { baseBurn: number; activeCounted: number; intake: number; eatStart: string | null; eatEnd: string | null }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div className="h-[68px] rounded-xl bg-card-2" />;

  const secs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const burned = (baseBurn * secs) / 86_400 + activeCounted;
  const running = burned - intake;

  const minNow = secs / 60;
  const start = toMin(eatStart);
  const end = toMin(eatEnd);
  let windowText: string | null = null;
  if (start != null && end != null && start !== end) {
    // minutes until a clock time, wrapping past midnight (so a 12:00–00:30 window works)
    const until = (m: number) => (m - minNow + 1440) % 1440;
    const open = start < end ? minNow >= start && minNow < end : minNow >= start || minNow < end;
    windowText = open
      ? `Eating window · closes in ${dur(until(end))}`
      : `Fasting for ${dur((minNow - end + 1440) % 1440)} · eating window opens in ${dur(until(start))}`;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="hb-flame grid h-10 w-10 place-items-center rounded-full bg-warn-soft text-warn">
          <Flame size={20} />
        </span>
        <div>
          <div className="text-xs font-medium text-muted">Burned so far today</div>
          <div className="text-xl font-extrabold tracking-tight tabular-nums">
            {burned.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            <span className="ml-1 text-sm font-semibold text-muted">kcal</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-medium text-muted">Running balance</div>
        <div className={`text-lg font-bold tabular-nums ${running >= 0 ? "text-good" : "text-bad"}`}>
          {running >= 0 ? "−" : "+"}
          {Math.abs(Math.round(running)).toLocaleString()} kcal
        </div>
      </div>
      {windowText && (
        <div className="flex w-full items-center gap-1.5 border-t border-line pt-2 text-xs text-muted">
          <Clock size={13} /> {windowText}
        </div>
      )}
    </div>
  );
}
