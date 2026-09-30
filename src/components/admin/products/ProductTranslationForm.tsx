"use client";

import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { MarkdownField } from "@/components/admin/products/MarkdownField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/locales";
import { LOCALE_META } from "@/i18n/locales";
import { upsertProductTranslation } from "@/server/admin/products/actions";

export interface ProductTranslationFormValues {
  name: string;
  shortDescription: string;
  description: string;
  applications: string;
  packagingInfo: string;
}

/**
 * One locale's content: name, short description, description and applications (both Markdown) and
 * packaging information. English is the only locale required to publish (see actions.ts), but every
 * locale row still needs a name once it exists at all (ProductTranslation.name is NOT NULL).
 */
export function ProductTranslationForm({
  id,
  version,
  locale,
  values,
}: {
  id: string;
  version: number;
  locale: Locale;
  values: ProductTranslationFormValues;
}) {
  return (
    <ActionForm
      key={`${locale}-${version}`}
      action={upsertProductTranslation}
      successMessage={`Saved the ${LOCALE_META[locale].nativeName} content.`}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="locale" value={locale} />

      <ActionField
        name="name"
        label="Name"
        required={locale === "en"}
        hint={
          locale === "en"
            ? "Required to publish."
            : "Leave blank to fall back to the English name on the public site."
        }
      >
        <Input dir={LOCALE_META[locale].dir} lang={LOCALE_META[locale].htmlLang} maxLength={200} defaultValue={values.name} />
      </ActionField>

      <ActionField
        name="shortDescription"
        label="Short description"
        hint="Shown on category cards. Required in English before publishing."
      >
        <Textarea
          dir={LOCALE_META[locale].dir}
          lang={LOCALE_META[locale].htmlLang}
          maxLength={500}
          defaultValue={values.shortDescription}
          className="min-h-20"
        />
      </ActionField>

      <MarkdownField
        name="description"
        label="Description"
        hint="Markdown: paragraphs, lists, links and headings (rendered without raw HTML)."
        locale={locale}
        defaultValue={values.description}
        maxLength={20_000}
      />

      <MarkdownField
        name="applications"
        label="Applications"
        hint="Markdown, same rules as the description."
        locale={locale}
        defaultValue={values.applications}
        maxLength={20_000}
      />

      <ActionField name="packagingInfo" label="Packaging information">
        <Textarea
          dir={LOCALE_META[locale].dir}
          lang={LOCALE_META[locale].htmlLang}
          maxLength={1000}
          defaultValue={values.packagingInfo}
          className="min-h-24"
        />
      </ActionField>

      <div>
        <ActionSubmit pendingLabel="Saving…">Save {LOCALE_META[locale].nativeName} content</ActionSubmit>
      </div>
    </ActionForm>
  );
}
