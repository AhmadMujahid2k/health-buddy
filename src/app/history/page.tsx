import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getStats } from "@/lib/queries";
import { fmt, fmtKm, KCAL_PER_KG_FAT } from "@/lib/calc";
import { PageHeader } from "@/components/ui";
import type { DayStats } from "@/lib/types";

export default function HistoryPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
      <History />
    </Suspense>
  );
}

/** green = within target, grey = over target but still a deficit, red = ate more than burned */
function intakeTone(s: DayStats, target: number) {
  if (!s.logged) return "text-muted";
  if (s.deficit < 0) return "text-bad";
  if (s.intake <= target) return "text-good";
  return "text-muted";
}

const COLS = "md:grid md:grid-cols-[1.3fr_1fr_1.3fr_0.8fr_1fr_1.2fr] md:items-center md:gap-4";

async function History() {
  await connection();
  const { profile: p, stats } = getStats();

  // weight change vs the previous weigh-in
  const change = new Map<string, number>();
  let prev: number | null = null;
  for (const s of stats) {
    if (s.weight == null) continue;
    if (prev != null) change.set(s.date, s.weight - prev);
    prev = s.weight;
  }
  const rows = [...stats].reverse();

  return (
    <div>
      <PageHeader title="History" subtitle="Every day since you started · tap a day to view or edit it" />
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span><span className="font-semibold text-good">Green</span> within {fmt(p.kcal_target)} kcal</span>
        <span><span className="font-semibold">Grey</span> over target, still a deficit</span>
        <span><span className="font-semibold text-bad">Red</span> ate more than you burned</span>
      </div>

      <div className={`hidden px-5 pb-2 text-xs font-semibold tracking-wide text-muted uppercase ${COLS}`}>
        <span>Day</span><span>Weight</span><span>Activity</span><span>Protein</span><span className="text-right">Eaten</span><span className="text-right">Deficit</span>
      </div>

      <ul className="space-y-2">
        {rows.map((s) => {
          const d = change.get(s.date);
          const fatG = Math.round((s.deficit / KCAL_PER_KG_FAT) * 1000);
          return (
            <li key={s.date}>
              <Link href={`/log?date=${s.date}`} className={`card block py-3.5 transition hover:border-brand ${COLS}`}>
                <div className="flex items-baseline justify-between md:block">
                  <div className="font-semibold">
                    {new Date(s.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    <span className="ml-2 text-xs font-normal text-muted">Day {s.dayNo}</span>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-sm md:contents">
                  <div>
                    <span className="text-xs text-muted md:hidden">Weight </span>
                    {s.weight != null ? (
                      <div>
                        <span className="font-semibold">{fmt(s.weight, 2)} kg</span>
                        {d != null &&
                          (Math.abs(d) < 0.005 ? (
                            <span className="ml-1.5 text-xs font-semibold text-muted" title="No change">– 0.00</span>
                          ) : (
                            <span className={`ml-1.5 text-xs font-semibold ${d < 0 ? "text-good" : "text-bad"}`}>
                              {d < 0 ? "▼" : "▲"} {fmt(Math.abs(d), 2)}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <div className="text-muted">–</div>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-muted md:hidden">Activity </span>
                    <div>
                      {s.steps != null ? (
                        <>
                          {fmt(s.steps)} steps <span className="text-xs text-muted">· {fmtKm(s.km, s.kmEstimated)}</span>
                        </>
                      ) : (
                        <span className="text-muted">–</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted md:hidden">Protein </span>
                    <div className={s.logged && s.protein >= p.protein_target ? "font-semibold text-good" : ""}>
                      {s.logged ? `${fmt(s.protein)} g` : <span className="text-muted">–</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-baseline justify-between md:contents">
                  <div className={`font-bold md:text-right ${intakeTone(s, p.kcal_target)}`}>
                    {s.logged ? `${fmt(s.intake)} kcal` : "not logged"}
                  </div>
                  <div className="text-right">
                    {s.logged ? (
                      <>
                        <div className={`font-bold ${s.deficit < 0 ? "text-bad" : ""}`}>
                          {s.deficit < 0 ? `+${fmt(-s.deficit)} surplus` : `${fmt(s.deficit)} kcal`}
                        </div>
                        <div className="text-xs text-muted">
                          <span className="md:hidden">{s.deficit < 0 ? "" : "deficit · "}</span>
                          {s.deficit < 0 ? `≈ ${fmt(-fatG)} g gained` : `≈ ${fmt(fatG)} g fat`}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted">–</span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
