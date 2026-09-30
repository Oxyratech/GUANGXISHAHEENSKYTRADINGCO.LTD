import type { Metadata } from "next";
import Form from "next/form";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { SeoDirectoryTable } from "@/components/admin/seo/SeoDirectoryTable";
import { SeoSearchTable } from "@/components/admin/seo/SeoSearchTable";
import { SeoTabs, type SeoTab } from "@/components/admin/seo/SeoTabs";
import { Input } from "@/components/ui/input";
import { asDatabaseOutage, requireAdminPage } from "@/server/admin/access";
import type { RawSearchParams } from "@/server/admin/pagination";
import type { SeoDirectoryEntry, SeoSearchResult } from "@/server/admin/seo/queries";
import {
  listStaticSeoDirectory,
  searchNewsTargets,
  searchProductTargets,
} from "@/server/admin/seo/queries";
import type { DatabaseUnavailableCause } from "@/server/db/errors";

export const metadata: Metadata = { title: "SEO overrides" };

const TABS: readonly SeoTab[] = ["pages", "categories", "products", "news"];
const DESCRIPTION =
  "Optional per-locale title, description and social image overrides. Pages show their default metadata unless one is set here.";

function parseTab(value: string | string[] | undefined): SeoTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return (TABS as readonly string[]).includes(raw ?? "") ? (raw as SeoTab) : "pages";
}

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

type PageData =
  | { kind: "directory"; rows: SeoDirectoryEntry[] }
  | { kind: "search"; results: SeoSearchResult[] }
  | { kind: "unavailable"; cause: DatabaseUnavailableCause };

async function loadPageData(tab: SeoTab, q: string): Promise<PageData> {
  try {
    if (tab === "pages" || tab === "categories") {
      const directory = await listStaticSeoDirectory();
      const rows = directory.filter((entry) =>
        tab === "pages" ? entry.scope === "PAGE" : entry.scope === "CATEGORY",
      );
      return { kind: "directory", rows };
    }
    const results = tab === "products" ? await searchProductTargets(q) : await searchNewsTargets(q);
    return { kind: "search", results };
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return { kind: "unavailable", cause: outage.cause };
  }
}

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requireAdminPage("seo:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="seo:read" />;

  const raw = await searchParams;
  const tab = parseTab(raw.tab);
  const q = firstValue(raw.q);
  const data = await loadPageData(tab, q);

  if (data.kind === "unavailable") {
    return (
      <>
        <PageHeader title="SEO overrides" />
        <DatabaseUnavailablePanel cause={data.cause} titleAs="h2" />
      </>
    );
  }

  return (
    <>
      <PageHeader title="SEO overrides" description={DESCRIPTION} />
      <div className="grid gap-4">
        <SeoTabs active={tab} />
        {data.kind === "directory" ? (
          <SeoDirectoryTable
            rows={data.rows}
            caption={tab === "pages" ? "Static pages" : "Categories"}
          />
        ) : (
          <>
            <Form
              action="/admin/seo"
              prefetch={false}
              role="search"
              aria-label={`Search ${tab}`}
              className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-3 shadow-card"
            >
              <input type="hidden" name="tab" value={tab} />
              <div className="grid min-w-56 gap-1.5">
                <label htmlFor="seo-search-q" className="text-label text-ink">
                  {tab === "products" ? "Product name or slug" : "Article title or slug"}
                </label>
                <Input id="seo-search-q" name="q" defaultValue={q} placeholder="Search…" />
              </div>
            </Form>
            <SeoSearchTable
              scope={tab === "products" ? "PRODUCT" : "NEWS"}
              results={data.results}
              query={q}
            />
          </>
        )}
      </div>
    </>
  );
}
