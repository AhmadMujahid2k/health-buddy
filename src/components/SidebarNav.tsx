import { connection } from "next/server";
import { getProfile } from "@/lib/queries";
import { hiddenSections } from "@/lib/sections";
import { OPTIONAL_TABS } from "@/lib/tabs";
import { NavLinks } from "./Shell";

/** Sidebar menu with the tabs switched off in Settings left out. */
export async function SidebarNav() {
  await connection();
  return <NavLinks hidden={[...hiddenSections(getProfile().hidden_tabs)]} />;
}

/** Shown while the settings load: only the tabs that can't be switched off, so hidden ones never flash in. */
export function SidebarNavFallback() {
  return <NavLinks hidden={OPTIONAL_TABS.map((t) => t.key)} />;
}
