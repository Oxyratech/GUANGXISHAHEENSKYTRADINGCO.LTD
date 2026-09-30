"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { UploadedAssetSummary } from "@/server/admin/media/actions";
import type { AdminFormAction } from "@/server/admin/action-state";

/**
 * A single public-image field backed by the media library: upload a file (through the same
 * `uploadMediaAsset` action the media library uses) or clear the current choice. The chosen asset id
 * travels as a plain hidden input, so the surrounding <ActionForm> submits it like any other field.
 */
export function MediaPickerField({
  name,
  label,
  hint,
  initialId,
  uploadAction,
}: {
  name: string;
  label: string;
  hint?: string;
  initialId: string | null;
  uploadAction: AdminFormAction<UploadedAssetSummary>;
}) {
  const [mediaId, setMediaId] = useState(initialId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("policy", "NEWS_IMAGE");
      formData.set("file", file);
      const state = await uploadAction(undefined, formData);
      if (state.status === "success") setMediaId(state.data.id);
      else if (state.status === "error") setError(state.message);
    });
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      {hint ? <p className="text-small text-ink-muted">{hint}</p> : null}
      <input type="hidden" name={name} value={mediaId ?? ""} />
      {mediaId ? (
        <div className="flex items-center gap-3">
          {/* Plain img: the media route serves arbitrary asset types, not a Next-optimisable set. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/media/${mediaId}`}
            alt=""
            className="size-16 rounded-md border border-line object-cover"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => setMediaId(null)}>
            Remove
          </Button>
        </div>
      ) : (
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(event) => handleFile(event.target.files?.[0])}
          className="block h-11 w-full cursor-pointer rounded-md border border-line-strong bg-white py-2 text-small file:me-3 file:h-full file:cursor-pointer file:border-0 file:bg-transparent file:px-3.5 file:text-label file:text-navy-900"
        />
      )}
      {error ? <p className="text-small text-danger-600">{error}</p> : null}
    </div>
  );
}
