import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getStats } from "@/lib/queries";
import { fmt, today } from "@/lib/calc";
import { weekly } from "@/lib/weekly";
import { PageHeader } from "@/components/ui";
import { DayList } from "@/components/DayList";
import { WeeklyTable } from "@/components/WeeklyTable";

export default function HistoryPage(props: PageProps<"/history">) {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
      <History searchParams={props.searchParams} />
    </Suspense>
  );
}

const TABS = [
  { view: "days", label: "Days", href: "/history" },
  { view: "weeks", label: "Weeks", href: "/history?view=weeks" },
] as const;

async function History({ searchParams }: { searchParams: PageProps<"/history">["searchParams"] }) {
  await connection();
  const view = (await searchParams).view === "weeks" ? "weeks" : "days";
  const t = today();
  const { profile: p, stats } = getStats();

  return (
    <div>
      <PageHeader
        title="History"
        subtitle={view === "days" ? "Every day since you started · tap a day to view or edit it" : "Every week since you started"}
      />
      <nav className="mb-4 inline-flex rounded-xl border border-line bg-card p-1" aria-label="History view">
        {TABS.map((tab) => (
          <Link
            key={tab.view}
            href={tab.href}
            aria-current={view === tab.view ? "page" : undefined}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              view === tab.view ? "bg-brand text-on-brand" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {view === "days" ? (
        <>
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span><span className="font-semibold text-good">Green</span> within {fmt(p.kcal_target)} kcal</span>
            <span><span className="font-semibold text-warn">Amber</span> under the {fmt(p.kcal_floor)} kcal minimum</span>
            <span><span className="font-semibold">Grey</span> over target, still a deficit</span>
            <span><span className="font-semibold text-bad">Red</span> ate more than you burned</span>
          </div>
          <DayList profile={p} stats={stats} />
        </>
      ) : (
        <section className="card overflow-x-auto">
          <p className="mb-3 text-xs text-muted">Small numbers = change from the week before</p>
          <WeeklyTable weeks={weekly(p, stats)} today={t} />
        </section>
      )}
    </div>
  );
}
