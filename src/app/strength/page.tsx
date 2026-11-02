import { Suspense } from "react";
import { connection } from "next/server";
import { getWorkoutSets } from "@/lib/queries";
import { today } from "@/lib/calc";
import { StrengthClient } from "@/components/StrengthClient";

export default function StrengthPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
      <Strength />
    </Suspense>
  );
}

async function Strength() {
  await connection();
  return <StrengthClient sets={getWorkoutSets()} today={today()} />;
}
