import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { NewsCoverageTable } from "@/components/admin/translations/NewsCoverageTable";
import { ProductCoverageTable } from "@/components/admin/translations/ProductCoverageTable";
import { SeoOverrideCoverageTable } from "@/components/admin/translations/SeoOverrideCoverageTable";
import { StaticContentCoveragePanel } from "@/components/admin/translations/StaticContentCoveragePanel";
import {
  TranslationTabs,
  type TranslationTab,
} from "@/components/admin/translations/TranslationTabs";
import { asDatabaseOutage, requireAdminPage } from "@/server/admin/access";
import type { RawSearchParams } from "@/server/admin/pagination";
import {
  computeNewsTranslationCoverage,
  type NewsGroupCoverage,
} from "@/server/admin/translations/news";
import {
  computeProductTranslationCoverage,
  type ProductTranslationCoverage,
} from "@/server/admin/translations/products";
import {
  computeSeoOverrideCoverage,
  type SeoOverrideCoverage,
} from "@/server/admin/translations/seo";
import {
  computeStaticContentCoverage,
  type StaticContentCoverage,
} from "@/server/admin/translations/static-content";
import type { DatabaseUnavailableCause } from "@/server/db/errors";

export const metadata: Metadata = { title: "Translation coverage" };

const TABS: readonly TranslationTab[] = ["products", "news", "static", "seo"];

function parseTab(value: string | string[] | undefined): TranslationTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return (TABS as readonly string[]).includes(raw ?? "") ? (raw as TranslationTab) : "products";
}

type PageData =
  | { kind: "products"; rows: ProductTranslationCoverage[] }
  | { kind: "news"; rows: NewsGroupCoverage[] }
  | { kind: "seo"; rows: SeoOverrideCoverage[] }
  | { kind: "static"; coverage: StaticContentCoverage }
  | { kind: "unavailable"; cause: DatabaseUnavailableCause };

async function loadPageData(tab: TranslationTab): Promise<PageData> {
  if (tab === "static") return { kind: "static", coverage: await computeStaticContentCoverage() };
  try {
    if (tab === "products")
      return { kind: "products", rows: await computeProductTranslationCoverage() };
    if (tab === "news") return { kind: "news", rows: await computeNewsTranslationCoverage() };
    return { kind: "seo", rows: await computeSeoOverrideCoverage() };
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return { kind: "unavailable", cause: outage.cause };
  }
}

export default async function TranslationsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requireAdminPage("translation:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="translation:read" />;

  const tab = parseTab((await searchParams).tab);
  const data = await loadPageData(tab);

  return (
    <>
      <PageHeader
        title="Translation coverage"
        description="Where content and metadata exist in every locale, and where they don't. All numbers come from the live data."
      />
      <div className="grid gap-4">
        <TranslationTabs active={tab} />
        {data.kind === "unavailable" ? (
          <DatabaseUnavailablePanel cause={data.cause} titleAs="h2" />
        ) : data.kind === "products" ? (
          <ProductCoverageTable rows={data.rows} />
        ) : data.kind === "news" ? (
          <NewsCoverageTable rows={data.rows} />
        ) : data.kind === "seo" ? (
          <SeoOverrideCoverageTable rows={data.rows} />
        ) : (
          <StaticContentCoveragePanel coverage={data.coverage} />
        )}
      </div>
    </>
  );
}
