import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { PageHeader } from "@/components/admin/PageHeader";
import { RegistryNotice } from "@/components/admin/RegistryNotice";
import { ServiceRegistryTable } from "@/components/admin/registry/ServiceRegistryTable";
import { requireAdminPage } from "@/server/admin/access";
import { listServiceRegistry } from "@/server/admin/registry/services";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesRegistryPage() {
  const access = await requireAdminPage("service:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="service:read" />;

  const rows = await listServiceRegistry();

  return (
    <>
      <PageHeader
        title="Services"
        description="The 6 business lines, each with a hand-authored public page."
      />
      <div className="grid gap-4">
        <RegistryNotice filePath="src/content/services.ts">
          Services are mapped to the registered business scope and each has a dedicated public page, so
          they are edited in the repository, not here.
        </RegistryNotice>
        <ServiceRegistryTable rows={rows} />
      </div>
    </>
  );
}
