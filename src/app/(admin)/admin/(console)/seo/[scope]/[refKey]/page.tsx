import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminLink } from "@/components/admin/AdminLink";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { SeoLocaleEditorCard } from "@/components/admin/seo/SeoLocaleEditorCard";
import type { Locale } from "@/i18n/locales";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import type { DatabaseUnavailableCause } from "@/server/db/errors";
import {
  getDefaultCategoryMetaPreview,
  getDefaultNewsMetaPreview,
  getDefaultPageMetaPreview,
  getDefaultProductMetaPreview,
  type DefaultMetaPreview,
} from "@/server/admin/seo/defaults";
import {
  getOverrideRows,
  getSeoEditorContext,
  type SeoEditorContext,
  type SeoOverrideRow,
} from "@/server/admin/seo/queries";
import { scopeFromSlug } from "@/server/admin/seo/scope-path";
import type { SeoScope } from "@/lib/domain/statuses";

export const metadata: Metadata = { title: "SEO override" };

function defaultPreview(scope: SeoScope, refKey: string, locale: Locale): Promise<DefaultMetaPreview> {
  if (scope === "PAGE") return getDefaultPageMetaPreview(refKey, locale);
  if (scope === "CATEGORY") return getDefaultCategoryMetaPreview(refKey, locale);
  if (scope === "PRODUCT") return getDefaultProductMetaPreview(refKey, locale);
  return getDefaultNewsMetaPreview(refKey);
}

type PageData =
  | {
      kind: "ready";
      context: SeoEditorContext;
      rowsByLocale: Map<Locale, SeoOverrideRow>;
      previews: DefaultMetaPreview[];
    }
  | { kind: "not_found" }
  | { kind: "unavailable"; cause: DatabaseUnavailableCause };

async function loadPageData(scope: SeoScope, refKey: string): Promise<PageData> {
  try {
    const context = await getSeoEditorContext(scope, refKey);
    if (!context) return { kind: "not_found" };

    const [rows, previews] = await Promise.all([
      getOverrideRows(scope, refKey),
      Promise.all(context.locales.map((locale) => defaultPreview(scope, refKey, locale))),
    ]);
    return { kind: "ready", context, rowsByLocale: new Map(rows.map((row) => [row.locale, row])), previews };
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return { kind: "unavailable", cause: outage.cause };
  }
}

export default async function SeoEditorPage({
  params,
}: {
  params: Promise<{ scope: string; refKey: string }>;
}) {
  const access = await requireAdminPage("seo:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="seo:read" />;

  const { scope: scopeSlugParam, refKey } = await params;
  const scope = scopeFromSlug(scopeSlugParam);
  if (!scope) notFound();

  const data = await loadPageData(scope, refKey);
  if (data.kind === "not_found") notFound();
  if (data.kind === "unavailable") {
    return (
      <>
        <PageHeader title="SEO override" />
        <DatabaseUnavailablePanel cause={data.cause} titleAs="h2" />
      </>
    );
  }

  const { context, rowsByLocale, previews } = data;
  const canWrite = hasAdminPermission(access.session, "seo:write");

  return (
    <>
      <PageHeader
        title={context.label}
        description={context.sublabel ?? undefined}
        breadcrumbs={[{ label: "SEO overrides", href: "/admin/seo" }, { label: context.label }]}
        actions={
          context.publicPath ? (
            <AdminLink href={context.publicPath} target="_blank" rel="noopener noreferrer">
              View public page
            </AdminLink>
          ) : null
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {context.locales.map((locale, index) => (
          <SeoLocaleEditorCard
            key={locale}
            scope={scope}
            refKey={refKey}
            locale={locale}
            row={rowsByLocale.get(locale) ?? null}
            defaultTitle={previews[index]?.title ?? null}
            defaultDescription={previews[index]?.description ?? null}
            canWrite={canWrite}
          />
        ))}
      </div>
    </>
  );
}
