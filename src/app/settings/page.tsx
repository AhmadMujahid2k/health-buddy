import { Suspense } from "react";
import { connection } from "next/server";
import { getProfile } from "@/lib/queries";
import { bmr, today } from "@/lib/calc";
import { SettingsClient } from "@/components/SettingsClient";

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  await connection();
  const p = getProfile();
  return <SettingsClient profile={p} startBmr={Math.round(bmr(p, p.start_weight, today()))} />;
}
