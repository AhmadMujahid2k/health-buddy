"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PiggyBank, Plus, Repeat, Target, TrendingDown, UtensilsCrossed } from "lucide-react";
import type { EventKind, EventRow } from "@/lib/types";
import { KINDS, kindOf, PLATE_PLAN, type EventPlan } from "@/lib/events";
import { PageHeader } from "./ui";

type Form = {
  id?: number; name: string; date: string; kind: EventKind; yearly: boolean;
  target_weight: string; extra_kcal: string; bank_days: string; notes: string;
};
const EMPTY: Form = { name: "", date: "", kind: "dawat", yearly: false, target_weight: "", extra_kcal: "", bank_days: "3", notes: "" };

/** Typical kcal over the daily target for each kind, used to prefill the form. */
const EXTRA_DEFAULT: Partial<Record<EventKind, number>> = { dawat: 800, wedding: 1000, restaurant: 600, birthday: 500, anniversary: 600 };

const toForm = (e: EventRow): Form => ({
  id: e.id, name: e.name, date: e.date, kind: e.kind, yearly: !!e.yearly,
  target_weight: e.target_weight?.toString() ?? "", extra_kcal: e.extra_kcal?.toString() ?? "",
  bank_days: String(e.bank_days), notes: e.notes ?? "",
});

const fmtDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export function EventsClient({ plans, current, kcalTarget }: { plans: EventPlan[]; current: number; kcalTarget: number }) {
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const upcoming = plans.filter((p) => p.daysLeft >= 0);
  const past = plans.filter((p) => p.daysLeft < 0).reverse();

  async function save() {
    if (!form) return;
    await fetch(form.id ? `/api/events/${form.id}` : "/api/events", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(null);
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setForm(null);
    router.refresh();
  }

  const setKind = (kind: EventKind) => {
    if (!form) return;
    const fill = !form.extra_kcal || Object.values(EXTRA_DEFAULT).includes(Number(form.extra_kcal));
    setForm({ ...form, kind, extra_kcal: fill ? (EXTRA_DEFAULT[kind]?.toString() ?? "") : form.extra_kcal, yearly: kind === "birthday" || kind === "anniversary" ? true : form.yearly });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Events"
        subtitle="Dawats, birthdays, anniversaries and dinners out: plan ahead, save calories, see where your weight will be"
        actions={<button className="btn" onClick={() => setForm({ ...EMPTY, extra_kcal: String(EXTRA_DEFAULT.dawat) })}><Plus size={16} /> Add event</button>}
      />

      {form && (
        <section className="card space-y-3">
          <h2 className="font-semibold">{form.id ? "Edit event" : "New event"}</h2>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.key}
                onClick={() => setKind(k.key)}
                className={`chip border ${form.kind === k.key ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-foreground"}`}
              >
                {k.emoji} {k.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm"><span className="text-muted">Name</span>
              <input className="input mt-1" placeholder="e.g. Ali's wedding, Tofu dinner" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="text-sm"><span className="text-muted">Date</span>
              <input className="input mt-1" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label className="text-sm"><span className="text-muted">Extra kcal expected on the day (over your {fmt(kcalTarget)} target)</span>
              <input className="input mt-1" type="number" inputMode="numeric" placeholder="0 = none" value={form.extra_kcal} onChange={(e) => setForm({ ...form, extra_kcal: e.target.value })} />
            </label>
            <label className="text-sm"><span className="text-muted">Save it up over how many days before</span>
              <input className="input mt-1" type="number" inputMode="numeric" min={1} max={14} value={form.bank_days} onChange={(e) => setForm({ ...form, bank_days: e.target.value })} />
            </label>
            <label className="text-sm"><span className="text-muted">Weight goal for this date, kg (optional)</span>
              <input className="input mt-1" type="number" inputMode="decimal" step="0.5" value={form.target_weight} onChange={(e) => setForm({ ...form, target_weight: e.target.value })} />
            </label>
            <label className="flex items-center gap-2.5 self-end rounded-lg border border-line px-3 py-2.5 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={form.yearly} onChange={(e) => setForm({ ...form, yearly: e.target.checked })} />
              Repeats every year
            </label>
          </div>
          <input className="input" placeholder="Notes (optional): venue, what's on the menu…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2">
            <button className="btn" onClick={save} disabled={!form.name || !form.date}>Save</button>
            <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
            {form.id && <button className="btn btn-ghost ml-auto text-bad" onClick={() => remove(form.id!)}>Delete</button>}
          </div>
        </section>
      )}

      {!upcoming.length && !form && (
        <section className="card py-10 text-center text-sm text-muted">
          No upcoming events. Add a dawat, a birthday or a dinner out to plan for it.
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {upcoming.map((p) => <EventCard key={p.event.id} plan={p} current={current} onEdit={() => setForm(toForm(p.event))} />)}
      </div>

      {past.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-bold">Past</h2>
          <ul className="divide-y divide-line text-sm">
            {past.map((p) => (
              <li key={p.event.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>{kindOf(p.event.kind).emoji} <b>{p.event.name}</b> <span className="text-muted">· {fmtDate(p.date)}</span></span>
                <span className="flex gap-2">
                  <Link href={`/log?date=${p.date}`} className="btn btn-ghost py-1 text-xs">Log what you ate</Link>
                  <button className="btn btn-ghost py-1 text-xs" onClick={() => setForm(toForm(p.event))}>Edit</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EventCard({ plan: p, current, onEdit }: { plan: EventPlan; current: number; onEdit: () => void }) {
  const k = kindOf(p.event.kind);
  const target = p.event.target_weight;
  const tips = PLATE_PLAN[p.event.kind];
  const when = p.daysLeft === 0 ? "Today" : p.daysLeft === 1 ? "Tomorrow" : `in ${p.daysLeft} days`;
  const onTime = p.reachOn != null && p.reachOn <= p.date;

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold">{k.emoji} {p.event.name}</h2>
          <p className="text-xs text-muted">
            {fmtDate(p.date)}
            {p.event.yearly ? <> · <Repeat size={11} className="inline" /> every year</> : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`chip whitespace-nowrap ${p.daysLeft <= 3 ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand"}`}>{when}</span>
          <button className="btn btn-ghost py-1 text-xs" onClick={onEdit}>Edit</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-card-2 p-3 text-sm">
        <div>
          <p className="text-xs text-muted"><TrendingDown size={12} className="inline" /> Weight on the day</p>
          <p className="text-lg font-bold">{p.forecast != null ? `~${fmt(p.forecast, 1)} kg` : "–"}</p>
          <p className="text-xs text-muted">at your current pace · now {fmt(current, 1)}</p>
        </div>
        {target != null ? (
          <div>
            <p className="text-xs text-muted"><Target size={12} className="inline" /> Goal {fmt(target, 1)} kg</p>
            {current <= target ? (
              <p className="text-lg font-bold text-good">Reached 🎉</p>
            ) : (
              <>
                <p className={`text-lg font-bold ${onTime ? "text-good" : "text-bad"}`}>
                  {p.reachOn ? new Date(p.reachOn + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "not at this pace"}
                </p>
                <p className="text-xs text-muted">
                  {p.kcalGap == null
                    ? "when you'll reach it"
                    : p.kcalGap > 0
                      ? `eat ~${fmt(Math.ceil(p.kcalGap / 10) * 10)} kcal/day less to make it`
                      : `on time with ~${fmt(Math.floor(-p.kcalGap / 10) * 10)} kcal/day to spare`}
                </p>
              </>
            )}
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted">Change by then</p>
            <p className="text-lg font-bold">{p.forecast != null ? `${p.forecast <= current ? "−" : "+"}${fmt(Math.abs(current - p.forecast), 1)} kg` : "–"}</p>
            <p className="text-xs text-muted">add a weight goal to track it</p>
          </div>
        )}
      </div>

      {p.bank && (
        <div className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm ${p.bank.today ? "border-brand bg-brand-soft" : "border-line"}`}>
          <PiggyBank size={18} className="mt-0.5 shrink-0 text-brand" />
          <p>
            {p.bank.today ? <b>Saving today: </b> : <b>Save-up plan: </b>}
            eat ~{fmt(p.bank.perDay)} kcal less a day from {new Date(p.bank.from + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })} to cover
            ~{fmt(p.event.extra_kcal!)} extra on the day.
          </p>
        </div>
      )}

      {tips && (
        <div className="text-sm">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted uppercase"><UtensilsCrossed size={12} /> Plate plan</p>
          <ul className="list-disc space-y-1 pl-5">
            {tips.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        </div>
      )}
      {p.event.notes && <p className="text-xs text-muted">📝 {p.event.notes}</p>}
    </section>
  );
}
