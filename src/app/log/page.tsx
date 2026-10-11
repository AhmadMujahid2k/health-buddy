import { Suspense } from "react";
import { connection } from "next/server";
import { getDay, getEntries, getProfile, getStats } from "@/lib/queries";
import { today } from "@/lib/calc";
import { LogClient } from "@/components/LogClient";

export default function LogPage(props: PageProps<"/log">) {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
      <LogData searchParams={props.searchParams} />
    </Suspense>
  );
}

async function LogData({ searchParams }: { searchParams: PageProps<"/log">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today();
  const p = getProfile();
  const { stats } = getStats(date);
  const s = stats.find((x) => x.date === date);
  return (
    <LogClient
      key={date}
      date={date}
      isToday={date === today()}
      entries={getEntries(date)}
      day={getDay(date)}
      totals={{ intake: s?.intake ?? 0, protein: s?.protein ?? 0, burn: s?.totalBurn ?? 0, deficit: s?.deficit ?? 0 }}
      targets={{ kcal: p.kcal_target, protein: p.protein_target, floor: p.kcal_floor }}
    />
  );
}
