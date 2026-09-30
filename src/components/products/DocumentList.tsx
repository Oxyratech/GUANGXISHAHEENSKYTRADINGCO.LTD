import { getTranslations } from "next-intl/server";
import { FileText } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import type { ProductDocument } from "@/server/products";
import { contentLanguageProps } from "./content-language";
import { DocumentDownloadLink } from "./DocumentDownloadLink";
import { fileTypeLabel, formatFileSize } from "./format-file";

/**
 * Public documents of a product (specification sheets, catalogs, certificates). Each row names the
 * document, its kind, file type and size, and links to the public media route. Private files are
 * never in the list: the repository selects PUBLIC assets only. Renders nothing without documents.
 */
export async function DocumentList({
  documents,
  name,
  productSlug,
  locale,
  className,
}: {
  documents: readonly ProductDocument[];
  name: string;
  productSlug: string;
  locale: Locale;
  className?: string;
}) {
  if (documents.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "products" });

  return (
    <ul aria-label={t("documents.listLabel", { name })} className={cn("grid gap-3", className)}>
      {documents.map((doc) => {
        const type = fileTypeLabel(doc.mimeType, doc.fileName);
        const size = formatFileSize(doc.sizeBytes, locale);
        return (
          <li
            key={doc.href}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-blue-600" />
              <div className="grid min-w-0 gap-1.5">
                <p
                  {...contentLanguageProps(doc.contentLocale, locale)}
                  className="text-label wrap-break-word text-navy-900"
                >
                  {doc.title}
                </p>
                <p className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
                  <Badge variant="blue">{t(`documents.kinds.${doc.kind}`)}</Badge>
                  <bdi>{type}</bdi>
                  <span aria-hidden>·</span>
                  <bdi>{size}</bdi>
                </p>
              </div>
            </div>
            <DocumentDownloadLink
              href={doc.href}
              label={t("documents.download")}
              accessibleName={t("documents.downloadLabel", { title: doc.title, type, size })}
              analytics={{
                document: doc.kind.toLowerCase().replaceAll("_", "-"),
                product: productSlug,
                locale,
              }}
            />
          </li>
        );
      })}
    </ul>
  );
}
