"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Alert } from "@/components/ui/alert";
import type { AdminFormAction } from "@/server/admin/action-state";

export interface DeleteAssetResult {
  id: string;
}

/**
 * Deletes a media asset after confirmation, blocked outright (no dialog to open) while anything still
 * references it. `blockedReasons` comes from the server (findMediaUsage), so this never has to decide
 * on its own whether a delete would be safe.
 */
export function DeleteAssetButton({
  action,
  assetId,
  fileName,
  blockedReasons,
}: {
  action: AdminFormAction<DeleteAssetResult>;
  assetId: string;
  fileName: string;
  /** Non-empty ("2 product images", "1 news cover") when the asset is currently in use. */
  blockedReasons: readonly string[];
}) {
  const router = useRouter();

  if (blockedReasons.length > 0) {
    return (
      <Alert variant="warning" title="This asset cannot be deleted">
        It is still used by {blockedReasons.join(", ")}. Remove it from those places first, then
        come back here.
      </Alert>
    );
  }

  return (
    <ConfirmButton
      action={action}
      fields={{ id: assetId }}
      label="Delete asset"
      variant="destructive"
      title="Delete this media asset?"
      description={
        <>
          &ldquo;{fileName}&rdquo; and its file will be permanently deleted. This cannot be undone.
        </>
      }
      confirmLabel="Delete asset"
      successMessage="Asset deleted"
      onSuccess={() => router.push("/admin/media")}
    />
  );
}
