"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays, CalendarHeart, Dumbbell, LayoutDashboard, Moon, Menu, PlusCircle, Settings, UtensilsCrossed, X, type LucideIcon,
} from "lucide-react";
import { Logo } from "./Logo";
import { PalettePicker, ThemeToggle } from "./ThemeToggle";
import { TABS, type TabKey } from "@/lib/tabs";

const ICONS: Record<TabKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  log: PlusCircle,
  history: CalendarDays,
  strength: Dumbbell,
  events: CalendarHeart,
  ramadan: Moon,
  foods: UtensilsCrossed,
  settings: Settings,
};

/** The menu links, minus the tabs switched off in Settings. */
export function NavLinks({ hidden }: { hidden: string[] }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-sidebar-text/60 uppercase">Menu</p>
      {TABS.filter((t) => !hidden.includes(t.key)).map(({ key, href, label }) => {
        const Icon = ICONS[key];
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active ? "bg-sidebar-active text-sidebar-strong shadow-sm" : "hover:bg-sidebar-line hover:text-sidebar-strong"
            }`}
          >
            <Icon size={18} strokeWidth={2} className={active ? "" : "text-sidebar-text/80 group-hover:text-sidebar-strong"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Sidebar({ nav, widget }: { nav: React.ReactNode; widget: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar px-4 py-5 text-sidebar-text">
      <Link href="/" className="px-2">
        <Logo />
      </Link>
      {nav}
      <div className="mt-auto space-y-3">
        {widget}
        <PalettePicker />
        <ThemeToggle />
        <p className="px-2 text-[11px] text-sidebar-text/50">Local · private · runs on this laptop</p>
      </div>
    </div>
  );
}

export function Shell({ children, nav, widget }: { children: React.ReactNode; nav: React.ReactNode; widget: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="min-h-screen">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-line md:block">
        <Sidebar nav={nav} widget={widget} />
      </aside>

      {/* mobile top bar + drawer */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-sidebar px-4 py-3 md:hidden">
        <Logo />
        <button aria-label="Open menu" className="rounded-lg p-2 text-sidebar-strong hover:bg-sidebar-line" onClick={() => setOpen(true)}>
          <Menu size={22} />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          {/* close the drawer on any link tap, even to the page you are already on */}
          <aside className="absolute inset-y-0 left-0 w-72 shadow-2xl" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
            <button
              aria-label="Close menu"
              className="absolute top-4 right-3 z-10 rounded-lg p-2 text-sidebar-strong hover:bg-sidebar-line"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
            <Sidebar nav={nav} widget={widget} />
          </aside>
        </div>
      )}

      <div className="md:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
