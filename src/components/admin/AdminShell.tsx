import { LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { SkipLink } from "@/components/site/SkipLink";
import { Button } from "@/components/ui/button";
import { formatRoleName } from "@/server/admin/format";
import type { AuthSession } from "@/server/auth/session";
import { MobileNav } from "./MobileNav";
import { getVisibleNav } from "./nav";
import { SidebarNav } from "./SidebarNav";
import { signOutAction } from "./sign-out-action";

/**
 * The frame of every signed-in admin screen: skip link, navy sidebar on desktop (a drawer on small
 * screens), a slim top bar with who is signed in, and the page. Sidebar entries are filtered by the
 * session's permissions; each page still enforces its own on the server.
 */
export function AdminShell({ session, children }: { session: AuthSession; children: ReactNode }) {
  const groups = getVisibleNav(session.permissions);
  const roles = session.roles.map(formatRoleName);

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <SkipLink label="Skip to content" />

      <aside className="hidden bg-navy-900 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto">
        <div className="flex flex-col gap-1 px-5 pt-6 pb-5">
          <Logo tone="onDark" size="sm" legalName="never" />
          <p className="ps-11.5 text-eyebrow text-gold-300">Admin</p>
        </div>
        <div className="flex-1 px-3 pb-6">
          <SidebarNav groups={groups} tone="dark" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-2 sm:px-6">
          <MobileNav groups={groups} />
          <div className="lg:hidden">
            <Logo size="sm" legalName="never" />
          </div>

          <div className="ms-auto flex min-w-0 items-center gap-3">
            <div className="min-w-0 text-end">
              <Link
                href="/admin/account"
                className="block max-w-[14rem] truncate rounded-xs text-label text-navy-900 hover:underline"
              >
                {session.user.name}
              </Link>
              {roles.length > 0 ? (
                <p className="hidden max-w-[14rem] truncate text-caption text-ink-muted sm:block">
                  {roles.join(", ")}
                </p>
              ) : null}
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut aria-hidden />
                Sign out
              </Button>
            </form>
          </div>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 focus-visible:outline-none! sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
