"use client";

import { CircleAlert } from "lucide-react";
import { useId } from "react";
import { useActionForm } from "@/components/admin/ActionForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** The slug field, with the server's uniqueness error (if any) and a "suggest from title" button. */
export function SlugField({
  value,
  onChange,
  onSuggest,
}: {
  value: string;
  onChange: (value: string) => void;
  onSuggest: () => void;
}) {
  const { fieldErrors } = useActionForm();
  const error = fieldErrors.slug?.join(" ");
  const slugId = useId();

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={slugId}>
        Slug
        <span aria-hidden className="ms-1 text-danger-600">
          *
        </span>
      </Label>
      <div className="flex gap-2">
        <Input
          id={slugId}
          name="slug"
          required
          maxLength={160}
          value={value}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button type="button" variant="outline" onClick={onSuggest}>
          Suggest from title
        </Button>
      </div>
      <p className="text-small text-ink-muted">
        Lowercase letters, numbers and hyphens. Unique within this article&apos;s locale.
      </p>
      {error ? (
        <p className="flex items-start gap-1.5 text-small text-danger-600">
          <CircleAlert aria-hidden className="mt-[0.2em] size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
