"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Food } from "@/lib/types";
import { PageHeader } from "./ui";

type Form = { id?: number; name: string; aliases: string; unit: string; kcal: number | string; protein: number | string; note: string; source?: string };
const EMPTY: Form = { name: "", aliases: "", unit: "piece", kcal: "", protein: "", note: "" };

export function FoodsClient({ foods }: { foods: Food[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const list = foods.filter((f) => !q || `${f.name} ${f.aliases}`.toLowerCase().includes(q.toLowerCase()));

  async function save() {
    if (!form) return;
    await fetch(form.id ? `/api/foods/${form.id}` : "/api/foods", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Food library"
        subtitle={`${foods.length} foods · values per unit · 🤖 = learned from Claude`}
        actions={<button className="btn" onClick={() => setForm({ ...EMPTY })}><Plus size={16} /> Add food</button>}
      />
      <input className="input" placeholder="Search… (roti, chai, boti)" value={q} onChange={(e) => setQ(e.target.value)} />

      {form && (
        <section className="card space-y-2">
          <h2 className="font-semibold">{form.id ? "Edit food" : "New food"}</h2>
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input
            className="input" placeholder="Words you'd say, comma separated (roti, chapati)" value={form.aliases}
            onChange={(e) => setForm({ ...form, aliases: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2">
            <label className="text-sm"><span className="text-muted">Per</span>
              <input className="input mt-1" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </label>
            <label className="text-sm"><span className="text-muted">kcal</span>
              <input className="input mt-1" type="number" inputMode="numeric" value={form.kcal} onChange={(e) => setForm({ ...form, kcal: e.target.value })} />
            </label>
            <label className="text-sm"><span className="text-muted">Protein g</span>
              <input className="input mt-1" type="number" inputMode="decimal" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
            </label>
          </div>
          <input className="input" placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="flex gap-2">
            <button className="btn" onClick={save} disabled={!form.name || !form.unit}>Save</button>
            <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
            {form.id && (
              <button
                className="btn btn-ghost ml-auto text-bad"
                onClick={async () => {
                  if (!confirm(`Delete ${form.name}?`)) return;
                  await fetch(`/api/foods/${form.id}`, { method: "DELETE" });
                  setForm(null);
                  router.refresh();
                }}
              >
                Delete
              </button>
            )}
          </div>
        </section>
      )}

      <ul className="card divide-y divide-line p-0">
        {list.map((f) => (
          <li key={f.id}>
            <button
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
              onClick={() => setForm({ id: f.id, name: f.name, aliases: f.aliases, unit: f.unit, kcal: f.kcal, protein: f.protein, note: f.note ?? "", source: f.source })}
            >
              <div>
                <div className="font-medium">
                  {f.name} {f.source === "claude" && <span title="Added by Claude">🤖</span>}
                </div>
                <div className="text-xs text-muted">per {f.unit}{f.uses ? ` · used ${f.uses}×` : ""}</div>
              </div>
              <div className="whitespace-nowrap text-right text-sm">
                <b>{Math.round(f.kcal)}</b> kcal<br />
                <span className="text-muted">{f.protein} g</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
