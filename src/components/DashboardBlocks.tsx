"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { BLOCKS, blockOrder, type BlockKey } from "@/lib/sections";
import { failed } from "@/lib/http";

type Block = { key: BlockKey; node: React.ReactNode };

const label = (key: BlockKey) => BLOCKS.find((b) => b.key === key)?.label ?? key;

/** Move the item at `from` to `to`. */
function move<T>(list: T[], from: number, to: number): T[] {
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

/**
 * The dashboard cards in the user's saved order. In arrange mode each card shrinks to a bar that can be dragged
 * (or moved with the arrow buttons on touch screens). Cards that aren't showing right now keep their place.
 */
export function DashboardBlocks({ blocks, saved, arranging }: { blocks: Block[]; saved: string | null; arranging: boolean }) {
  const router = useRouter();
  const nodes = new Map(blocks.map((b) => [b.key, b.node]));
  const full = blockOrder(saved);
  const shown = full.filter((k) => nodes.get(k));
  const [list, setList] = useState<BlockKey[]>(shown);
  const [saving, setSaving] = useState(false);
  const dragFrom = useRef<number | null>(null);

  if (!arranging) {
    return <>{shown.map((k) => <div key={k} className="min-w-0">{nodes.get(k)}</div>)}</>;
  }

  const save = async (order: string | null) => {
    setSaving(true);
    const err = await failed(
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_order: order }),
      }),
    );
    setSaving(false);
    if (err) return alert(`Not saved: ${err}`);
    router.push("/");
    router.refresh();
  };

  // put the rearranged cards back into the slots the visible cards had, so hidden ones stay where they were
  const merged = () => {
    const queue = [...list];
    return full.map((k) => (shown.includes(k) ? queue.shift()! : k)).join(",");
  };

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">Rearrange dashboard</h2>
          <p className="text-xs text-muted">Drag a card, or use the arrows. Hidden cards keep their place.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" disabled={saving} onClick={() => save(null)}>Reset</button>
          <Link href="/" className="btn btn-ghost">Cancel</Link>
          <button className="btn" disabled={saving} onClick={() => save(merged())}>{saving ? "Saving…" : "Done"}</button>
        </div>
      </div>
      <ol className="space-y-2">
        {list.map((k, i) => (
          <li
            key={k}
            draggable
            onDragStart={(e) => {
              dragFrom.current = i;
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", k);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              const from = dragFrom.current;
              if (from == null || from === i) return;
              // functional update: drag-over can fire several times before React re-renders
              setList((l) => move(l, from, i));
              dragFrom.current = i;
            }}
            onDragEnd={() => (dragFrom.current = null)}
            className="flex cursor-grab items-center gap-3 rounded-xl border border-line bg-card-2 px-3 py-2.5 text-sm font-medium select-none active:cursor-grabbing"
          >
            <GripVertical size={18} className="shrink-0 text-muted" />
            <span className="w-6 text-xs text-muted tabular-nums">{i + 1}</span>
            <span className="flex-1">{label(k)}</span>
            <button
              className="rounded-lg p-1.5 text-muted hover:bg-card hover:text-foreground disabled:opacity-30"
              aria-label={`Move ${label(k)} up`}
              disabled={i === 0}
              onClick={() => setList((l) => move(l, i, i - 1))}
            >
              <ArrowUp size={16} />
            </button>
            <button
              className="rounded-lg p-1.5 text-muted hover:bg-card hover:text-foreground disabled:opacity-30"
              aria-label={`Move ${label(k)} down`}
              disabled={i === list.length - 1}
              onClick={() => setList((l) => move(l, i, i + 1))}
            >
              <ArrowDown size={16} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
