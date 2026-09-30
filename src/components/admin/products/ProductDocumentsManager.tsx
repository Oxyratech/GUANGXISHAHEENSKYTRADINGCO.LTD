"use client";

import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, FileText } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ConfirmInputButton } from "@/components/admin/products/ConfirmInputButton";
import { useInputAction } from "@/components/admin/products/useInputAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/locales";
import { DOCUMENT_KINDS, type DocumentKind } from "@/lib/domain/statuses";
import { formatBytes } from "@/server/admin/format";
import type { ProductEditDocument } from "@/server/admin/products/detail";
import {
  moveProductDocument,
  removeProductDocument,
  setProductDocumentKind,
  updateProductDocumentTranslation,
  uploadProductDocument,
} from "@/server/admin/products/document-actions";
import { MAX_PRODUCT_DOCUMENTS } from "@/server/admin/products/constants";
import type { UploadPolicySummary } from "@/server/storage";

const KIND_LABEL: Record<DocumentKind, string> = {
  SPECIFICATION_SHEET: "Specification sheet",
  CATALOGUE: "Catalogue",
  CERTIFICATE: "Certificate",
  OTHER: "Other",
};

function TitleRow({
  productId,
  documentId,
  locale,
  defaultValue,
}: {
  productId: string;
  documentId: string;
  locale: Locale;
  defaultValue: string;
}) {
  const { run, pending } = useInputAction(updateProductDocumentTranslation);
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        run({ productId, documentId, locale, title: value });
      }}
    >
      <label className="w-10 shrink-0 text-caption text-ink-muted">{locale.toUpperCase()}</label>
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        dir={LOCALE_META[locale].dir}
        maxLength={200}
        placeholder="Title"
        aria-label={`${LOCALE_META[locale].nativeName} title`}
      />
      <Button type="submit" size="sm" variant="outline" loading={pending}>
        Save
      </Button>
    </form>
  );
}

function DocumentRow({
  productId,
  document,
}: {
  productId: string;
  document: ProductEditDocument;
}) {
  const router = useRouter();
  const move = useInputAction(moveProductDocument);
  const setKind = useInputAction(setProductDocumentKind);
  const titleByLocale = new Map(document.translations.map((t) => [t.locale, t.title]));

  return (
    <li className="grid gap-3 rounded-lg border border-line bg-white p-3 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <FileText aria-hidden className="size-6 shrink-0 text-ink-subtle" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-ink">{document.fileName}</p>
          <p className="text-caption text-ink-muted">{formatBytes(document.sizeBytes)}</p>
        </div>
        <Select
          aria-label="Document type"
          value={document.kind}
          disabled={setKind.pending}
          onChange={(event) =>
            setKind.run({ productId, documentId: document.id, kind: event.target.value })
          }
          wrapperClassName="w-56"
        >
          {DOCUMENT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABEL[kind]}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Move up"
          loading={move.pending}
          onClick={() => move.run({ productId, documentId: document.id, direction: "up" })}
        >
          <ArrowUp aria-hidden className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Move down"
          loading={move.pending}
          onClick={() => move.run({ productId, documentId: document.id, direction: "down" })}
        >
          <ArrowDown aria-hidden className="size-4" />
        </Button>
        <ConfirmInputButton
          action={removeProductDocument}
          input={{ productId, documentId: document.id }}
          label="Remove"
          size="sm"
          title="Remove this document"
          description="The document is removed from this product; if nothing else uses it, it is deleted."
          confirmLabel="Remove document"
          successMessage="Document removed."
          onSuccess={() => router.refresh()}
        />
      </div>
      <div className="grid gap-2">
        {LOCALES.map((locale) => (
          <TitleRow
            key={locale}
            productId={productId}
            documentId={document.id}
            locale={locale}
            defaultValue={titleByLocale.get(locale) ?? ""}
          />
        ))}
      </div>
    </li>
  );
}

/**
 * Upload, classify, reorder, remove and title (per locale) a product's PDFs. CERTIFICATE is only ever
 * a kind a staff member chooses for a file they uploaded here — nothing generates one automatically.
 */
export function ProductDocumentsManager({
  productId,
  documents,
  policy,
}: {
  productId: string;
  documents: readonly ProductEditDocument[];
  /** From describeUploadPolicy(PUBLIC_DOCUMENT), computed on the server (it reads UPLOAD_MAX_BYTES). */
  policy: UploadPolicySummary;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<DocumentKind>("SPECIFICATION_SHEET");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const atLimit = documents.length >= MAX_PRODUCT_DOCUMENTS;

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    const form = event.currentTarget;
    setBusy(true);
    setError(null);

    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("kind", kind);
    formData.set("file", file);
    const state = await uploadProductDocument(undefined, formData);
    if (state.status === "error") setError(state.message);

    setBusy(false);
    setFile(null);
    form.reset();
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <form
        onSubmit={handleUpload}
        className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
      >
        <div className="grid gap-1.5">
          <label htmlFor="product-document-kind" className="text-label text-ink">
            Type
          </label>
          <Select
            id="product-document-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as DocumentKind)}
          >
            {DOCUMENT_KINDS.map((value) => (
              <option key={value} value={value}>
                {KIND_LABEL[value]}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="product-document-file" className="text-label text-ink">
            Add a PDF
          </label>
          <Input
            id="product-document-file"
            type="file"
            accept={policy.mimeTypes.join(",")}
            disabled={atLimit}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-caption text-ink-muted">
            Up to {formatBytes(policy.maxBytes)}. PDF only. At most {MAX_PRODUCT_DOCUMENTS}{" "}
            documents per product ({documents.length} so far).
          </p>
        </div>
        <Button type="submit" loading={busy} disabled={!file || atLimit}>
          Upload
        </Button>
      </form>
      {error ? <p className="text-small text-danger-600">{error}</p> : null}

      {documents.length === 0 ? (
        <p className="text-small text-ink-muted">No documents yet.</p>
      ) : (
        <ul className="grid gap-3">
          {documents.map((document) => (
            <DocumentRow key={document.id} productId={productId} document={document} />
          ))}
        </ul>
      )}
    </div>
  );
}
