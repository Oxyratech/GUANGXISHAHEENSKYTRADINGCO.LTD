"use client";

import { useState } from "react";
import { useActionForm } from "@/components/admin/ActionForm";
import { ProductRichText } from "@/components/products/ProductRichText";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/locales";

/**
 * A Markdown textarea with a "Preview" toggle that renders it through the same ProductRichText
 * component the public product page uses, so an editor sees exactly what a visitor will. Built
 * directly on FormField (not ActionField) because its label doubles as the row that holds the toggle.
 */
export function MarkdownField({
  name,
  label,
  hint,
  locale,
  defaultValue,
  maxLength,
}: {
  name: string;
  label: string;
  hint?: string;
  locale: Locale;
  defaultValue: string;
  maxLength: number;
}) {
  const { fieldErrors } = useActionForm();
  const [preview, setPreview] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const error = fieldErrors[name]?.join(" ");

  const fieldLabel = (
    <span className="flex items-center justify-between gap-3">
      {label}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={preview}
        onClick={() => setPreview((current) => !current)}
      >
        {preview ? "Edit" : "Preview"}
      </Button>
    </span>
  );

  return (
    <FormField label={fieldLabel} hint={hint} error={error}>
      {(control) =>
        preview ? (
          <div className="rounded-md border border-line bg-surface p-3.5">
            {value.trim() ? (
              <ProductRichText text={value} contentLocale={locale} locale={locale} />
            ) : (
              <p className="text-small text-ink-subtle">Nothing to preview yet.</p>
            )}
            <input type="hidden" name={name} value={value} />
          </div>
        ) : (
          <Textarea
            {...control}
            name={name}
            value={value}
            maxLength={maxLength}
            onChange={(event) => setValue(event.target.value)}
            className="min-h-48 font-mono text-small"
          />
        )
      }
    </FormField>
  );
}
