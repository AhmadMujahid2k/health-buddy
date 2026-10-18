import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getStats } from "@/lib/queries";
import { fmt, fmtKm } from "@/lib/calc";
import { PageHeader } from "@/components/ui";

export default function HistoryPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
      <History />
    </Suspense>
  );
}

async function History() {
  await connection();
  const { profile: p, stats } = getStats();
  const rows = [...stats].reverse();
  return (
    <div>
      <PageHeader title="History" subtitle="Every day since you started · tap a day to view or edit it" />
      <ul className="grid gap-3 md:grid-cols-2">
        {rows.map((s) => {
          const over = s.intake > p.kcal_target;
          return (
            <li key={s.date}>
              <Link href={`/log?date=${s.date}`} className="card flex items-center justify-between gap-3 py-3.5 transition hover:border-brand">
                <div>
                  <div className="font-semibold">
                    {new Date(s.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    <span className="ml-2 text-xs font-normal text-muted">Day {s.dayNo}</span>
                  </div>
                  <div className="text-xs text-muted">
                    {s.weight != null ? `${fmt(s.weight, 2)} kg · ` : ""}
                    {s.steps != null ? `${fmt(s.steps)} steps (${fmtKm(s.km, s.kmEstimated)}) · ` : ""}
                    {fmt(s.protein)} g protein
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${!s.logged ? "text-muted" : over ? "text-bad" : "text-good"}`}>
                    {s.logged ? `${fmt(s.intake)} kcal` : "not logged"}
                  </div>
                  {s.logged && <div className="text-xs text-muted">deficit {fmt(s.deficit)}</div>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
