"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { LOCALES, type Locale } from "@/i18n/locales";
import { useToast } from "@/components/ui/toast";
import { createNewsTranslation } from "@/server/admin/news/actions";

/** Offered only for locales this story does not already have a version in. */
export function CreateTranslationButton({
  sourceId,
  existingLocales,
}: {
  sourceId: string;
  existingLocales: readonly Locale[];
}) {
  const missing = LOCALES.filter((locale) => !existingLocales.includes(locale));
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Locale | "">(missing[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  if (missing.length === 0) return null;

  function confirm() {
    if (!target) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("sourceId", sourceId);
      formData.set("targetLocale", target);
      const result = await createNewsTranslation(undefined, formData);
      if (result.status === "success") {
        setOpen(false);
        toast({ title: result.message ?? "Translation created.", variant: "success" });
        router.push(`/admin/news/${result.data.id}`);
      } else if (result.status === "error") {
        setError(result.message);
      }
    });
  }

  return (
    <Modal
      size="sm"
      trigger={
        <Button variant="outline" size="sm">
          Create translation
        </Button>
      }
      open={open}
      onOpenChange={(next) => {
        if (!pending) {
          setOpen(next);
          if (next) setError(null);
        }
      }}
      title="Create a translation"
      description="Copies the title, content, cover and tags into a new draft in the chosen locale, ready to translate."
      closeLabel="Close"
      footer={
        <>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button loading={pending} onClick={confirm} disabled={!target}>
            Create draft
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <div className="grid gap-1.5">
          <label htmlFor="translation-locale" className="text-label text-ink">
            New locale
          </label>
          <Select
            id="translation-locale"
            value={target}
            onChange={(event) => setTarget(event.target.value as Locale)}
          >
            {missing.map((locale) => (
              <option key={locale} value={locale}>
                {locale.toUpperCase()}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Modal>
  );
}
