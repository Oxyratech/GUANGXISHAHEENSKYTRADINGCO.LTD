import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminLink } from "@/components/admin/AdminLink";
import { AdminNotFound } from "@/components/admin/AdminNotFound";
import { CopyValue } from "@/components/admin/CopyValue";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { DefinitionList, type DefinitionItem } from "@/components/admin/DefinitionList";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { AssetTranslationForm } from "@/components/admin/media/AssetTranslationForm";
import { DeleteAssetButton } from "@/components/admin/media/DeleteAssetButton";
import { MediaThumbnail } from "@/components/admin/media/MediaThumbnail";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { LOCALE_META, LOCALES } from "@/i18n/locales";
import { absoluteUrl } from "@/lib/seo";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import { formatBytes } from "@/server/admin/format";
import {
  deleteMediaAsset,
  describeMediaUsage,
  getMediaAssetDetail,
  updateMediaTranslation,
} from "@/server/admin/media";

// A static title, not the file name: generateMetadata runs outside the page's own permission check,
// and this asset's data must not be read before that check happens (docs/SECURITY.md §4).
export const metadata: Metadata = { title: "Media asset" };

const BREADCRUMBS = [{ label: "Media library", href: "/admin/media" }];

/**
 * One asset: its facts, its alt text and caption per locale, and where it is used. Deleting is
 * blocked outright while any relation still points at it (see DeleteAssetButton / findMediaUsage).
 */
export default async function MediaAssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await requireAdminPage("media:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="media:read" />;
  const { session } = access;
  const { id } = await params;

  let detail;
  try {
    detail = await getMediaAssetDetail(id);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Media asset" breadcrumbs={[...BREADCRUMBS, { label: "Asset" }]} />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }
  if (!detail) return <AdminNotFound />;

  const canEdit = hasAdminPermission(session, "media:upload");
  const canDelete = hasAdminPermission(session, "media:delete");
  const translationsByLocale = new Map(detail.translations.map((row) => [row.locale, row]));
  const publicUrl = detail.visibility === "PUBLIC" ? absoluteUrl(`/media/${detail.id}`) : null;
  const blockedReasons = describeMediaUsage(detail.usage);

  const facts: DefinitionItem[] = [
    { label: "File name", value: detail.fileName },
    { label: "Kind", value: detail.kind === "IMAGE" ? "Image" : "Document" },
    {
      label: "Visibility",
      value: (
        <Badge variant={detail.visibility === "PUBLIC" ? "success" : "neutral"}>
          {detail.visibility === "PUBLIC" ? "Public" : "Private"}
        </Badge>
      ),
    },
    { label: "MIME type", value: detail.mimeType },
    { label: "Size", value: formatBytes(detail.sizeBytes) },
    {
      label: "Dimensions",
      value: detail.width && detail.height ? `${detail.width} × ${detail.height} px` : null,
    },
    {
      label: "SHA-256",
      value: <span className="font-mono text-caption">{detail.sha256.slice(0, 16)}&hellip;</span>,
    },
    { label: "Uploaded by", value: detail.uploadedBy?.name ?? null },
    { label: "Uploaded", value: <LocalDateTime value={detail.createdAt} /> },
  ];

  return (
    <>
      <PageHeader
        title={detail.fileName}
        breadcrumbs={[...BREADCRUMBS, { label: detail.fileName }]}
        actions={
          canDelete ? (
            <DeleteAssetButton
              action={deleteMediaAsset}
              assetId={detail.id}
              fileName={detail.fileName}
              blockedReasons={blockedReasons}
            />
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div className="grid gap-3">
          <div className="aspect-square w-full overflow-hidden rounded-lg border border-line bg-surface">
            <MediaThumbnail
              id={detail.id}
              kind={detail.kind}
              visibility={detail.visibility}
              fileName={detail.fileName}
            />
          </div>
          {publicUrl ? (
            <div className="rounded-lg border border-line bg-white p-3">
              <p className="mb-1 text-caption text-ink-muted">Public URL</p>
              <CopyValue value={publicUrl} label="public URL" />
            </div>
          ) : (
            <p className="text-caption text-ink-subtle">
              Private assets have no public URL; they open only through an authorised link.
            </p>
          )}
        </div>

        <div className="grid gap-6">
          <section
            aria-labelledby="asset-facts-heading"
            className="rounded-lg border border-line bg-white p-4 shadow-card"
          >
            <h2 id="asset-facts-heading" className="mb-3 text-label text-navy-900">
              Details
            </h2>
            <DefinitionList items={facts} columns={2} />
          </section>

          <section
            aria-labelledby="asset-usage-heading"
            className="rounded-lg border border-line bg-white p-4 shadow-card"
          >
            <h2 id="asset-usage-heading" className="mb-3 text-label text-navy-900">
              Used by
            </h2>
            {blockedReasons.length === 0 ? (
              <p className="text-small text-ink-muted">
                This asset is not currently used anywhere.
              </p>
            ) : (
              <ul className="grid gap-3 text-small">
                {detail.usage.productImages.length + detail.usage.productDocuments.length > 0 ? (
                  <li>
                    <p className="font-medium text-navy-900">Products</p>
                    <ul className="ms-4 list-disc text-ink-muted">
                      {[...detail.usage.productImages, ...detail.usage.productDocuments].map(
                        (product) => (
                          <li key={`${product.id}-${product.slug}`}>
                            {product.name || product.slug}
                          </li>
                        ),
                      )}
                    </ul>
                  </li>
                ) : null}
                {detail.usage.newsCovers.length > 0 ? (
                  <li>
                    <p className="font-medium text-navy-900">News articles</p>
                    <ul className="ms-4 list-disc text-ink-muted">
                      {detail.usage.newsCovers.map((article) => (
                        <li key={article.id}>
                          {article.title} ({article.locale})
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : null}
                {detail.usage.seoOgImages.length > 0 ? (
                  <li>
                    <p className="font-medium text-navy-900">SEO Open Graph images</p>
                    <ul className="ms-4 list-disc text-ink-muted">
                      {detail.usage.seoOgImages.map((entry) => (
                        <li key={entry.id}>
                          {entry.scope} &middot; {entry.refKey} ({entry.locale})
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : null}
                {detail.usage.inquiryAttachments.length > 0 ? (
                  <li>
                    <p className="font-medium text-navy-900">Inquiry attachments</p>
                    <ul className="ms-4 list-disc text-ink-muted">
                      {detail.usage.inquiryAttachments.map((attachment) => (
                        <li key={attachment.id}>
                          <AdminLink href={`/admin/inquiries/${attachment.inquiryId}`}>
                            {attachment.referenceCode}
                          </AdminLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : null}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="asset-translations-heading"
            className="rounded-lg border border-line bg-white p-4 shadow-card"
          >
            <h2 id="asset-translations-heading" className="mb-1 text-label text-navy-900">
              Alt text and caption
            </h2>
            {canEdit ? (
              <p className="mb-4 text-small text-ink-muted">
                Shown to visitors using a screen reader, and used by search engines. One version per
                language.
              </p>
            ) : (
              <p className="mb-4 text-small text-ink-muted">
                Your account cannot edit media, so this is shown read-only.
              </p>
            )}
            <div className="grid gap-6 sm:grid-cols-3">
              {LOCALES.map((locale) => {
                const existing = translationsByLocale.get(locale);
                const initial = {
                  altText: existing?.altText ?? null,
                  caption: existing?.caption ?? null,
                };
                return canEdit ? (
                  <AssetTranslationForm
                    key={locale}
                    action={updateMediaTranslation}
                    assetId={detail.id}
                    locale={locale}
                    localeLabel={LOCALE_META[locale].nativeName}
                    initial={initial}
                  />
                ) : (
                  <div key={locale} className="grid gap-2">
                    <p className="text-label text-navy-900">{LOCALE_META[locale].nativeName}</p>
                    <DefinitionList
                      columns={1}
                      items={[
                        { label: "Alt text", value: initial.altText },
                        { label: "Caption", value: initial.caption },
                      ]}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
