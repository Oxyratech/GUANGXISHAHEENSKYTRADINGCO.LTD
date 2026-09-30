"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavActiveState, type AdminNavGroup } from "./nav";
import { NavIcon } from "./nav-icons";

const TONES = {
  // On the navy sidebar.
  dark: {
    heading: "text-blue-200",
    link: "text-blue-50 hover:bg-white/10 hover:text-white",
    active: "bg-white/10 text-white",
  },
  // On the white mobile drawer.
  light: {
    heading: "text-ink-subtle",
    link: "text-ink hover:bg-surface hover:text-navy-900",
    active: "bg-blue-50 text-navy-900",
  },
} as const;

/**
 * The grouped navigation. `groups` arrives already filtered by permission on the server, so a link the
 * user cannot use is never sent to the browser. The current page carries aria-current="page"; an
 * entry that contains the current page (an inquiry's detail page inside Inquiries) carries "true".
 */
export function SidebarNav({
  groups,
  tone = "dark",
  label = "Admin",
}: {
  groups: readonly AdminNavGroup[];
  tone?: keyof typeof TONES;
  label?: string;
}) {
  const pathname = usePathname();
  const styles = TONES[tone];

  return (
    <nav aria-label={label}>
      <ul className="grid gap-5">
        {groups.map((group) => (
          <li key={group.label}>
            {/* The list carries the group name for assistive tech, so the visible heading is not read twice. */}
            <p aria-hidden className={cn("mb-1.5 px-3 text-eyebrow", styles.heading)}>
              {group.label}
            </p>
            <ul aria-label={group.label} className="grid gap-0.5">
              {group.items.map((item) => {
                const state = getNavActiveState(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={
                        state === "page" ? "page" : state === "section" ? "true" : undefined
                      }
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-md border-s-2 border-transparent px-3 py-2 text-label transition-colors duration-150",
                        styles.link,
                        state && cn(styles.active, "border-gold-400"),
                      )}
                    >
                      <NavIcon name={item.icon} className="size-[1.125rem] shrink-0" />
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
