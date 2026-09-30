"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import type { AdminNavGroup } from "./nav";
import { SidebarNav } from "./SidebarNav";

/**
 * The navigation for screens narrower than the desktop sidebar: a menu button that opens a drawer.
 * Radix supplies the focus trap, Esc, scroll lock and focus return to the button. The drawer closes by
 * itself when the route changes: the open state remembers the path it was opened on, so no effect is
 * needed to reset it.
 */
export function MobileNav({ groups }: { groups: readonly AdminNavGroup[] }) {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  return (
    <Drawer
      side="start"
      open={open}
      onOpenChange={(next) => setOpenedOn(next ? pathname : null)}
      trigger={
        <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden">
          <Menu aria-hidden />
        </Button>
      }
      title="Menu"
      description="Admin navigation"
      hideDescription
      closeLabel="Close menu"
    >
      <SidebarNav groups={groups} tone="light" />
    </Drawer>
  );
}
