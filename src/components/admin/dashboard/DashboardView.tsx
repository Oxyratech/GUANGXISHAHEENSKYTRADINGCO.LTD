import { AdminLink } from "@/components/admin/AdminLink";
import { EmptyPanel } from "@/components/admin/EmptyPanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import type { DashboardData } from "@/server/admin/dashboard/queries";
import type { AuthSession } from "@/server/auth/session";
import { RecentActivity } from "./RecentActivity";
import { RecentInquiries } from "./RecentInquiries";
import { StatusCountTable } from "./StatusCountTable";
import { SystemPanel } from "./SystemPanel";

function SectionHeading({
  id,
  children,
  action,
}: {
  id: string;
  children: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-body font-semibold text-navy-900">
        {children}
      </h2>
      {action ? (
        <AdminLink href={action.href} className="text-small">
          {action.label}
        </AdminLink>
      ) : null}
    </div>
  );
}

/**
 * The dashboard body. Every block is real data from `DashboardData`, and a block whose section is
 * `null` (the user lacks that permission) is not drawn at all. Zero is shown as zero, and an empty
 * table says so in words; there are no sample values, charts or placeholders.
 */
export function DashboardView({
  data,
  session,
}: {
  data: DashboardData;
  session: Pick<AuthSession, "user" | "roles">;
}) {
  const { inquiries, contact, products, news, audit } = data;
  const hasStats = Boolean(inquiries || contact || news);
  const hasBreakdowns = Boolean(inquiries || products);
  const hasAnyData = hasStats || hasBreakdowns || Boolean(audit);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="What is happening on the site, read live from the database."
      />

      {/* grid-cols-1 (minmax(0, 1fr)) lets a wide table scroll inside its own region instead of stretching the page. */}
      <div className="grid grid-cols-1 gap-8">
        {hasStats ? (
          <section aria-labelledby="dashboard-figures">
            <h2 id="dashboard-figures" className="sr-only">
              Key figures
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {inquiries ? (
                <>
                  <StatCard
                    label="New inquiries"
                    value={inquiries.newCount}
                    description={
                      inquiries.newCount > 0 ? "Waiting for review" : "Nothing waiting for review"
                    }
                    tone={inquiries.newCount > 0 ? "highlight" : "default"}
                    href="/admin/inquiries?status=NEW"
                  />
                  <StatCard
                    label="Inquiries received, last 7 days"
                    value={inquiries.receivedLast7Days}
                    description={`${inquiries.total.toLocaleString("en-US")} in total`}
                  />
                </>
              ) : null}
              {contact ? (
                <StatCard
                  label="New contact messages"
                  value={contact.newCount}
                  description={`${contact.total.toLocaleString("en-US")} in total`}
                  href="/admin/contact-messages?status=NEW"
                />
              ) : null}
              {news ? (
                <StatCard
                  label="Published news articles"
                  value={news.published}
                  description={`${news.total.toLocaleString("en-US")} in total, including drafts`}
                  href="/admin/news"
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {hasBreakdowns ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {inquiries ? (
              <StatusCountTable
                title="Inquiries by status"
                counts={inquiries.byStatus}
                total={inquiries.total}
              />
            ) : null}
            {products ? (
              <StatusCountTable
                title="Products by status"
                counts={products.byStatus}
                total={products.total}
              />
            ) : null}
          </div>
        ) : null}

        {inquiries ? (
          <section aria-labelledby="dashboard-recent-inquiries">
            <SectionHeading
              id="dashboard-recent-inquiries"
              action={{ href: "/admin/inquiries", label: "All inquiries" }}
            >
              Recent inquiries
            </SectionHeading>
            <RecentInquiries rows={inquiries.recent} />
          </section>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          {audit ? (
            <section aria-labelledby="dashboard-activity" className="lg:col-span-2">
              <SectionHeading
                id="dashboard-activity"
                action={{ href: "/admin/audit-logs", label: "Full audit log" }}
              >
                Recent activity
              </SectionHeading>
              <RecentActivity rows={audit.recent} />
            </section>
          ) : null}
          <div className={audit ? undefined : "lg:col-span-3"}>
            <SystemPanel database="connected" user={session.user} roles={session.roles} />
          </div>
        </div>

        {!hasAnyData ? (
          <EmptyPanel
            title="No dashboard figures are available for your role"
            description="Your account can sign in, but its permissions do not include any of the data shown here. Use the menu to open the areas you can work in."
          />
        ) : null}
      </div>
    </>
  );
}
