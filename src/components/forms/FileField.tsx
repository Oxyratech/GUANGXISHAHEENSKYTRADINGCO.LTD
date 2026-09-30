"use client";

import { useFormatter } from "next-intl";
import { useEffect, useRef, type ChangeEvent } from "react";
import { Paperclip, X } from "@/components/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import type { FormControlProps } from "@/components/ui/form-field";
import { acceptedExtensions, type FileLike, type UploadRules } from "@/lib/validation/attachment";

export interface FileFieldLabels {
  choose: string;
  replace: string;
  none: string;
  remove: string;
  /** "Remove {name}": the accessible name of the remove button. */
  removeNamed: (name: string) => string;
}

const BYTES_PER_KIB = 1024;
const BYTES_PER_MIB = BYTES_PER_KIB * BYTES_PER_KIB;

/**
 * One optional file. The native input is visually hidden and its label is styled as a button, so
 * the words on it come from our translations instead of the browser's language. It stays the real,
 * focusable control (the label shows its focus ring). The choice is held by the parent form: a
 * `null` file clears the input, which is how "Remove" and a form reset take effect.
 */
export function FileField({
  control,
  rules,
  file,
  onChange,
  labels,
}: {
  control: FormControlProps;
  rules: UploadRules;
  file: FileLike | null;
  onChange: (file: File | null) => void;
  labels: FileFieldLabels;
}) {
  const format = useFormatter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file === null && inputRef.current) inputRef.current.value = "";
  }, [file]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0] ?? null);
  }

  function formatSize(bytes: number): string {
    const large = bytes >= BYTES_PER_MIB;
    return format.number(bytes / (large ? BYTES_PER_MIB : BYTES_PER_KIB), {
      style: "unit",
      unit: large ? "megabyte" : "kilobyte",
      maximumFractionDigits: 1,
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          {...control}
          ref={inputRef}
          type="file"
          accept={acceptedExtensions(rules)
            .map((extension) => `.${extension}`)
            .join(",")}
          onChange={handleChange}
          className="peer sr-only"
        />
        <label
          htmlFor={control.id}
          className={buttonVariants({
            variant: "outline",
            className:
              "cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
          })}
        >
          <Paperclip aria-hidden />
          {file ? labels.replace : labels.choose}
        </label>
        {file ? null : <span className="text-small text-ink-muted">{labels.none}</span>}
      </div>

      {file ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line bg-surface ps-3.5 pe-1 text-small">
          <span className="min-w-0 py-2 break-all text-ink">
            <bdi>{file.name}</bdi>
          </span>
          <span className="py-2 text-ink-muted">{formatSize(file.size)}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ms-auto"
            aria-label={labels.removeNamed(file.name)}
            onClick={() => onChange(null)}
          >
            <X aria-hidden />
            {labels.remove}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
