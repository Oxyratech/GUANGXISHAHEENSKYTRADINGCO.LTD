"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { PublishStatus } from "@/lib/domain/statuses";
import { changeProductStatus, deleteProduct } from "@/server/admin/products/actions";

/** Publish/unpublish/archive controls and delete, gated by the permissions the page already checked. */
export function ProductStatusPanel({
  id,
  version,
  status,
  canPublish,
  canDelete,
}: {
  id: string;
  version: number;
  status: PublishStatus;
  canPublish: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const fields = { id, version: String(version) };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge status={status} />
      {canPublish && status !== "PUBLISHED" ? (
        <ConfirmButton
          action={changeProductStatus}
          fields={{ ...fields, status: "PUBLISHED" }}
          label="Publish"
          destructive={false}
          title="Publish this product"
          description="It will become visible on the public site once its English content is complete."
          confirmLabel="Publish product"
          successMessage="Product published."
        />
      ) : null}
      {canPublish && status === "PUBLISHED" ? (
        <ConfirmButton
          action={changeProductStatus}
          fields={{ ...fields, status: "DRAFT" }}
          label="Unpublish"
          title="Unpublish this product"
          description="It will be removed from the public site and become a draft again."
          confirmLabel="Unpublish product"
          successMessage="Product unpublished."
        />
      ) : null}
      {canPublish && status !== "ARCHIVED" ? (
        <ConfirmButton
          action={changeProductStatus}
          fields={{ ...fields, status: "ARCHIVED" }}
          label="Archive"
          title="Archive this product"
          description="It will be removed from the public site and marked archived."
          confirmLabel="Archive product"
          successMessage="Product archived."
        />
      ) : null}
      {canPublish && status === "ARCHIVED" ? (
        <ConfirmButton
          action={changeProductStatus}
          fields={{ ...fields, status: "DRAFT" }}
          label="Restore to draft"
          destructive={false}
          title="Restore this product to draft"
          description="It stays off the public site until it is published again."
          confirmLabel="Restore to draft"
          successMessage="Product restored to draft."
        />
      ) : null}
      {canDelete ? (
        <ConfirmButton
          action={deleteProduct}
          fields={fields}
          label="Delete product"
          variant="destructive"
          title="Delete this product"
          description="This permanently deletes the product, its content in every language and any of its images or documents not used elsewhere. This cannot be undone."
          confirmLabel="Delete product"
          successMessage="Product deleted."
          onSuccess={() => router.push("/admin/products")}
        />
      ) : null}
    </div>
  );
}
