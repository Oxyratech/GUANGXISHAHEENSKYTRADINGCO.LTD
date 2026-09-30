import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { PageHeader } from "@/components/admin/PageHeader";
import { FaqRegistryTable } from "@/components/admin/registry/FaqRegistryTable";
import { RegistryNotice } from "@/components/admin/RegistryNotice";
import { requireAdminPage } from "@/server/admin/access";
import { listFaqRegistry } from "@/server/admin/registry/faqs";

export const metadata: Metadata = { title: "FAQs" };

export default async function FaqsRegistryPage() {
  const access = await requireAdminPage("faq:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="faq:read" />;

  const rows = await listFaqRegistry();

  return (
    <>
      <PageHeader
        title="FAQs"
        description="Frequently asked questions shown on the public site, grouped as they appear there."
      />
      <div className="grid gap-4">
        <RegistryNotice filePath="src/messages/en/faq.json" publicPath="/faq">
          FAQ copy is reviewed content stored in the translation files, not the database, so it is
          edited in the repository, not here. Each question links to where it appears on the public
          page.
        </RegistryNotice>
        <FaqRegistryTable rows={rows} />
      </div>
    </>
  );
}
