import { Suspense } from "react";
import { connection } from "next/server";
import { getEvents, getStats } from "@/lib/queries";
import { today } from "@/lib/calc";
import { planEvents } from "@/lib/events";
import { EventsClient } from "@/components/EventsClient";

export default function EventsPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
      <Events />
    </Suspense>
  );
}

async function Events() {
  await connection();
  const t = today();
  const { profile: p, stats } = getStats(t);
  const current = stats.filter((s) => s.weight != null).at(-1)?.weight ?? p.start_weight;
  return <EventsClient plans={planEvents(getEvents(), stats, t, current)} current={current} kcalTarget={p.kcal_target} />;
}
