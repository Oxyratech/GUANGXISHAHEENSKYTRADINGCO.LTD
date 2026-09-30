import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand";
import { Alert } from "@/components/ui/alert";
import { asDatabaseOutage } from "@/server/admin/access";
import { sanitizeAdminNextPath } from "@/server/admin/next-path";
import type { RawSearchParams } from "@/server/admin/pagination";
import { getSession, type AuthSession } from "@/server/auth/session";
import { isDatabaseConfigured } from "@/server/db";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

const NOT_CONFIGURED =
  "The admin area needs a database connection (DATABASE_URL). See docs/DATABASE.md.";
const UNAVAILABLE =
  "The database is not available right now, so sign-in is not possible. Try again shortly.";

/**
 * /admin/login is the only public admin page. A signed-in user is sent on to the page they asked for
 * (or the dashboard). Without a database nobody can sign in, and the page says so instead of letting
 * people type a password that cannot be checked.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = sanitizeAdminNextPath(rawNext);

  const configured = isDatabaseConfigured();
  let unavailable = false;
  let session: AuthSession | null = null;
  if (configured) {
    try {
      session = await getSession();
    } catch (error) {
      if (!asDatabaseOutage(error)) throw error;
      unavailable = true;
    }
  }
  if (session) redirect(next);

  const notice = !configured ? NOT_CONFIGURED : unavailable ? UNAVAILABLE : null;

  return (
    <main
      id="main"
      tabIndex={-1}
      className="grid min-h-dvh place-items-center px-4 py-10 focus-visible:outline-none!"
    >
      <div className="grid w-full max-w-sm gap-6">
        <Logo size="md" />
        <div className="grid gap-5 rounded-lg border border-line bg-white p-6 shadow-card">
          <div className="grid gap-1">
            <h1 className="text-h3 text-navy-900">Sign in</h1>
            <p className="text-small text-ink-muted">Staff access to the Shaheen Sky admin area.</p>
          </div>
          {notice ? (
            <Alert variant="warning" title="Sign-in is unavailable">
              {notice}
            </Alert>
          ) : null}
          <LoginForm next={next} disabled={notice !== null} />
        </div>
        <p className="text-caption text-ink-muted">
          Sign-in attempts are recorded. Accounts are created by an administrator.
        </p>
      </div>
    </main>
  );
}
