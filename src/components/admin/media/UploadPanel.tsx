"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/server/admin/format";
import type { AdminFormAction } from "@/server/admin/action-state";
import type { UploadedAssetSummary } from "@/server/admin/media/actions";

export interface UploadPolicyOption {
  key: string;
  label: string;
  maxBytes: number;
  mimeTypes: string[];
  extensions: string[];
}

interface FileResult {
  name: string;
  status: "pending" | "success" | "error";
  message?: string;
}

/**
 * Choose a policy, pick one or more files, upload them one at a time. Each file gets its own result
 * line (the upload error codes are shown in plain words), so a batch of five where one is too large
 * still leaves the other four uploaded and visible.
 */
export function UploadPanel({
  action,
  policies,
}: {
  action: AdminFormAction<UploadedAssetSummary>;
  policies: readonly UploadPolicyOption[];
}) {
  const [policyKey, setPolicyKey] = useState(policies[0]?.key ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<FileResult[]>([]);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const selected = policies.find((entry) => entry.key === policyKey);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0 || busy) return;
    const form = event.currentTarget;

    setBusy(true);
    setResults(files.map((file) => ({ name: file.name, status: "pending" })));

    let successCount = 0;
    for (const [index, file] of files.entries()) {
      const formData = new FormData();
      formData.set("policy", policyKey);
      formData.set("file", file);

      let outcome: FileResult;
      try {
        const state = await action(undefined, formData);
        if (state.status === "success") {
          successCount += 1;
          outcome = { name: file.name, status: "success", message: state.message };
        } else if (state.status === "error") {
          outcome = { name: file.name, status: "error", message: state.message };
        } else {
          outcome = { name: file.name, status: "error", message: "Nothing was uploaded." };
        }
      } catch {
        outcome = {
          name: file.name,
          status: "error",
          message: "The request could not be completed. Check your connection and try again.",
        };
      }
      setResults((current) => current.map((entry, i) => (i === index ? outcome : entry)));
    }

    setBusy(false);
    setFiles([]);
    form.reset();
    if (successCount > 0) {
      toast({
        title: `Uploaded ${successCount} file${successCount === 1 ? "" : "s"}`,
        variant: "success",
      });
    }
  }

  return (
    <section
      aria-labelledby="upload-media-heading"
      className="grid gap-4 rounded-lg border border-line bg-white p-4 shadow-card"
    >
      <h2 id="upload-media-heading" className="text-label text-navy-900">
        Upload media
      </h2>
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-[14rem_1fr_auto] sm:items-end"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="upload-media-policy">Upload type</Label>
          <Select
            id="upload-media-policy"
            value={policyKey}
            onChange={(event) => setPolicyKey(event.target.value)}
          >
            {policies.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="upload-media-files">Files</Label>
          <input
            id="upload-media-files"
            type="file"
            multiple
            accept={selected?.mimeTypes.join(",")}
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            className={cn(
              "block h-11 w-full cursor-pointer rounded-md border border-line-strong bg-white py-2 text-small",
              "file:me-3 file:h-full file:cursor-pointer file:border-0 file:bg-transparent file:px-3.5 file:text-label file:text-navy-900",
            )}
          />
          {selected ? (
            <p className="text-caption text-ink-muted">
              Up to {formatBytes(selected.maxBytes)} each. Accepted:{" "}
              {selected.extensions.join(", ")}.
            </p>
          ) : null}
        </div>
        <Button type="submit" loading={busy} disabled={files.length === 0}>
          Upload
        </Button>
      </form>

      {results.length > 0 ? (
        <ul aria-live="polite" className="grid gap-1.5">
          {results.map((result, index) => (
            <li
              key={`${result.name}-${index}`}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-line px-3 py-2 text-small"
            >
              <span className="min-w-0 truncate font-medium text-navy-900">{result.name}</span>
              {result.status === "pending" ? (
                <span className="text-ink-muted">Uploading&hellip;</span>
              ) : null}
              {result.status === "success" ? (
                <span className="text-success-600">{result.message ?? "Uploaded"}</span>
              ) : null}
              {result.status === "error" ? (
                <span className="text-danger-600">{result.message ?? "Upload failed"}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
