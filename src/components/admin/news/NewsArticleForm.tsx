"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { MarkdownEditor } from "@/components/admin/news/MarkdownEditor";
import { SlugField } from "@/components/admin/news/SlugField";
import { MediaPickerField } from "@/components/admin/seo/MediaPickerField";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LOCALES } from "@/i18n/locales";
import { PUBLISH_STATUSES } from "@/lib/domain/statuses";
import { uploadMediaAsset } from "@/server/admin/media/actions";
import { createNewsArticle, updateNewsArticle } from "@/server/admin/news/actions";
import type { NewsArticleForEdit, NewsFormOptions } from "@/server/admin/news/detail";
import { suggestSlugFromTitle } from "@/server/admin/news/slugify";

/** Local, editable-only ISO date-time for a <input type="datetime-local">: "2026-06-01T09:30". */
function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function NewsArticleForm({
  article,
  options,
  canPublish,
  defaultAuthorName,
}: {
  /** Omit to create a new article. */
  article?: NewsArticleForEdit;
  options: NewsFormOptions;
  canPublish: boolean;
  /** The signed-in user's name, the byline's default when the field is left blank. */
  defaultAuthorName: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(article));

  const action = article ? updateNewsArticle : createNewsArticle;

  return (
    <ActionForm
      key={article?.updatedAt ?? "new"}
      action={action}
      successMessage={article ? "Article saved." : "Article created."}
      onSuccess={(data) => {
        if (!article) router.push(`/admin/news/${data.id}`);
      }}
      className="grid max-w-3xl gap-5"
    >
      {article ? (
        <>
          <input type="hidden" name="id" value={article.id} />
          <input type="hidden" name="version" value={article.version} />
        </>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <ActionField name="locale" label="Locale" required>
          <Select defaultValue={article?.locale ?? "en"}>
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {locale.toUpperCase()}
              </option>
            ))}
          </Select>
        </ActionField>

        <ActionField name="categoryId" label="Category">
          <Select defaultValue={article?.categoryId ?? ""}>
            <option value="">No category</option>
            {options.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </ActionField>
      </div>

      <ActionField name="title" label="Title" required>
        <Input
          maxLength={250}
          value={title}
          onChange={(event) => {
            const next = event.target.value;
            setTitle(next);
            if (!slugTouched) setSlug(suggestSlugFromTitle(next));
          }}
        />
      </ActionField>

      <SlugField
        value={slug}
        onChange={(value) => {
          setSlug(value);
          setSlugTouched(true);
        }}
        onSuggest={() => {
          setSlug(suggestSlugFromTitle(title));
          setSlugTouched(true);
        }}
      />

      <ActionField
        name="summary"
        label="Summary"
        required
        hint="Shown in article listings and used as the default description. Up to 600 characters."
      >
        <Textarea maxLength={600} defaultValue={article?.summary} className="min-h-24" />
      </ActionField>

      <MarkdownEditor
        name="content"
        label="Content (Markdown)"
        defaultValue={article?.content ?? ""}
      />

      <MediaPickerField
        name="coverMediaId"
        label="Cover image"
        hint="Public image only. Shown on the article page and in listings."
        initialId={article?.coverMediaId ?? null}
        uploadAction={uploadMediaAsset}
      />

      <ActionField
        name="tagNames"
        label="Tags"
        hint="Comma-separated. A name that doesn't match an existing tag creates a new one."
      >
        <Input
          defaultValue={article?.tagNames.join(", ") ?? ""}
          placeholder="Trade fairs, Company news"
        />
      </ActionField>

      <ActionField
        name="authorName"
        label="Author byline"
        hint={`Defaults to your name (${defaultAuthorName}) when left blank.`}
      >
        <Input
          maxLength={120}
          defaultValue={article?.authorName ?? ""}
          placeholder={defaultAuthorName}
        />
      </ActionField>

      <div className="grid gap-5 sm:grid-cols-2">
        <ActionField name="status" label="Status" required>
          <Select defaultValue={article?.status ?? "DRAFT"}>
            {PUBLISH_STATUSES.map((status) => (
              <option key={status} value={status} disabled={status === "PUBLISHED" && !canPublish}>
                {status === "PUBLISHED" && !canPublish ? "Published (requires permission)" : status}
              </option>
            ))}
          </Select>
        </ActionField>

        <ActionField
          name="publishedAt"
          label="Publish date"
          hint="Blank publishes immediately when status is Published. A future date schedules it."
        >
          <Input
            type="datetime-local"
            defaultValue={toDateTimeLocal(article?.publishedAt ?? null)}
          />
        </ActionField>
      </div>

      {!canPublish ? (
        <Alert variant="info">
          You can save this article as a draft. Publishing it requires the news:publish permission.
        </Alert>
      ) : null}

      <div>
        <ActionSubmit pendingLabel="Saving…">
          {article ? "Save article" : "Create article"}
        </ActionSubmit>
      </div>
    </ActionForm>
  );
}
