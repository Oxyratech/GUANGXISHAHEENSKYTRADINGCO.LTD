import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminNotFound } from "@/components/admin/AdminNotFound";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductCoreForm } from "@/components/admin/products/ProductCoreForm";
import { ProductEditorTabs } from "@/components/admin/products/ProductEditorTabs";
import { ProductStatusPanel } from "@/components/admin/products/ProductStatusPanel";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import { getProductForEdit } from "@/server/admin/products/detail";
import { describeUploadPolicy, PRODUCT_IMAGE, PUBLIC_DOCUMENT } from "@/server/storage";

export const metadata: Metadata = { title: "Edit product" };

export default async function ProductEditPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const access = await requireAdminPage("product:read", { next: `/admin/products/${id}` });
  if (!access.ok) return <AdminAccessFailure access={access} permission="product:read" />;
  const { session } = access;

  let product;
  try {
    product = await getProductForEdit(id);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Product" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }
  if (!product) return <AdminNotFound />;

  const englishName = product.translations.find((t) => t.locale === "en")?.name ?? product.slug;
  const canWrite = hasAdminPermission(session, "product:write");
  const canPublish = hasAdminPermission(session, "product:publish");
  const canDelete = hasAdminPermission(session, "product:delete");

  return (
    <>
      <PageHeader
        title={englishName}
        description={product.slug}
        breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: englishName }]}
        actions={
          <ProductStatusPanel
            id={product.id}
            version={product.version}
            status={product.status}
            canPublish={canPublish}
            canDelete={canDelete}
          />
        }
      />
      <div className="grid gap-6">
        {canWrite ? (
          <section className="rounded-lg border border-line bg-white p-5 shadow-card">
            <h2 className="mb-4 text-label text-ink">Core fields</h2>
            <ProductCoreForm
              id={product.id}
              version={product.version}
              slug={product.slug}
              categorySlug={product.categorySlug}
              origin={product.origin}
              sortOrder={product.sortOrder}
              featured={product.featured}
            />
          </section>
        ) : null}

        {canWrite ? (
          <ProductEditorTabs
            product={product}
            imagePolicy={describeUploadPolicy(PRODUCT_IMAGE)}
            documentPolicy={describeUploadPolicy(PUBLIC_DOCUMENT)}
          />
        ) : (
          <p className="text-small text-ink-muted">
            You do not have permission to edit this product&apos;s content.
          </p>
        )}
      </div>
    </>
  );
}
