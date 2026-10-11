import { Suspense } from "react";
import { connection } from "next/server";
import { getFoods } from "@/lib/queries";
import { FoodsClient } from "@/components/FoodsClient";

export default function FoodsPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
      <Foods />
    </Suspense>
  );
}

async function Foods() {
  await connection();
  return <FoodsClient foods={getFoods()} />;
}
