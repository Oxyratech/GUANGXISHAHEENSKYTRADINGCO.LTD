import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { FileText } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/section";
import { ArticleCard } from "@/components/news/ArticleCard";
import { CategoryFilter } from "@/components/news/CategoryFilter";
import { NEWS_PAGE_SIZE, newsArticlePath, newsListHref } from "@/components/news/hrefs";
import { parseNewsListParams } from "@/components/news/list-params";
import { TagFilterNotice } from "@/components/news/TagFilterNotice";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button-link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { assertLocale } from "@/i18n/assert-locale";
import { redirect } from "@/i18n/navigation";
import {
  breadcrumbJsonLd,
  buildMetadata,
  collectionPageJsonLd,
  JsonLd,
  localizedUrl,
} from "@/lib/seo";
import { listCategories, listPublishedArticles } from "@/server/news";
import { applySeoOverride, getSeoOverride } from "@/server/seo";

/**
 * Reads `searchParams` (page, category, tag), so this page is rendered per request; the database
 * reads behind it are cached for five minutes (see @/server/news).
 */
export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/news">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const { page, category, tag } = parseNewsListParams(await searchParams);
  const t = await getTranslations({ locale, namespace: "news" });

  const filtered = Boolean(category || tag);
  const generated = buildMetadata({
    locale,
    path: "/news",
    title: page > 1 ? t("meta.pagedTitle", { page }) : t("meta.title"),
    description: t("meta.description"),
    // A filtered view repeats articles that the unfiltered list already carries.
    noIndex: filtered,
  });
  const metadata = applySeoOverride(
    generated,
    await getSeoOverride({ scope: "PAGE", refKey: "news", locale }),
  );
  if (page === 1 || filtered) return metadata;

  // Each page of the archive is its own indexable address, not a duplicate of page 1.
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      canonical: `${localizedUrl(locale, "/news")}?page=${page}`,
    },
  };
}

export default async function NewsPage({ params, searchParams }: PageProps<"/[locale]/news">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const { page, category, tag } = parseNewsListParams(await searchParams);

  const [t, common, errors, list, categoryResult] = await Promise.all([
    getTranslations({ locale, namespace: "news" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "errors" }),
    listPublishedArticles({
      locale,
      page,
      pageSize: NEWS_PAGE_SIZE,
      categorySlug: category,
      tagSlug: tag,
    }),
    listCategories({ locale }),
  ]);

  // A stale link to a page that no longer exists lands on the last one instead of an empty grid.
  if (list.status === "ok" && list.data.pageCount > 0 && page > list.data.pageCount) {
    redirect({ href: newsListHref({ category, tag, page: list.data.pageCount }), locale });
  }

  const categories = categoryResult.status === "ok" ? categoryResult.data : [];
  const isFiltered = Boolean(category || tag);
  const showCategoryFilter = categories.length > 1 || Boolean(category);

  const cardLabels = {
    readArticle: t("list.readArticle"),
    published: t("article.published"),
    category: t("article.category"),
    tags: t("article.tags"),
  };
  const companyName = (chunks: ReactNode) => (
    <bdi lang={locale === "zh" ? "zh-CN" : "en"}>{chunks}</bdi>
  );

  const newsTitle = t("hero.title");
  const articles = list.status === "ok" ? list.data.items : [];
  const isFirstPageOfEverything = page === 1 && !isFiltered;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, [
            { name: common("breadcrumb.home"), path: "/" },
            { name: newsTitle, path: "/news" },
          ]),
          ...(isFirstPageOfEverything && articles.length > 0
            ? [
                collectionPageJsonLd({
                  locale,
                  path: "/news",
                  name: newsTitle,
                  description: t("meta.description"),
                  items: articles.map((article) => ({
                    name: article.title,
                    path: newsArticlePath(article.slug),
                  })),
                }),
              ]
            : []),
        ]}
      />

      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t.rich("hero.description", { company: companyName })}
        breadcrumb={
          <Breadcrumb
            label={common("a11y.breadcrumb")}
            items={[{ label: common("breadcrumb.home"), href: "/" }, { label: newsTitle }]}
          />
        }
      />

      <Section aria-labelledby="news-list-heading">
        <Container>
          <h2 id="news-list-heading" className="sr-only">
            {t("list.heading")}
          </h2>

          {list.status === "unavailable" ? (
            <ErrorState
              title={t("unavailable.title")}
              description={errors("databaseUnavailable")}
              action={
                <ButtonLink href={newsListHref({ category, tag, page })} variant="outline">
                  {common("labels.retry")}
                </ButtonLink>
              }
            />
          ) : (
            <div
              className={
                showCategoryFilter ? "grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12" : ""
              }
            >
              {showCategoryFilter ? (
                <CategoryFilter
                  categories={categories}
                  activeSlug={category}
                  labels={{ heading: t("filter.heading"), all: t("filter.all") }}
                  className="lg:sticky lg:top-24 lg:self-start"
                />
              ) : null}

              <div className="min-w-0">
                {tag && list.data.activeTag ? (
                  <TagFilterNotice
                    className="mb-6"
                    notice={t.rich("filter.tagNotice", {
                      tag: list.data.activeTag.name,
                      strong: (chunks) => (
                        <strong className="font-semibold text-navy-900">
                          <bdi>{chunks}</bdi>
                        </strong>
                      ),
                    })}
                    clearLabel={t("filter.clear")}
                    clearHref={newsListHref({ category })}
                  />
                ) : null}

                {list.data.items.length === 0 ? (
                  isFiltered ? (
                    <EmptyState
                      titleAs="h3"
                      icon={<FileText />}
                      title={t("empty.filteredTitle")}
                      description={t("empty.filteredDescription")}
                      action={
                        <ButtonLink href={newsListHref()} variant="outline">
                          {t("empty.showAll")}
                        </ButtonLink>
                      }
                    />
                  ) : (
                    <EmptyState
                      titleAs="h3"
                      icon={<FileText />}
                      title={t("empty.title")}
                      description={t("empty.description")}
                      action={
                        <div className="flex flex-wrap justify-center gap-3">
                          <ButtonLink href="/business">{common("cta.exploreBusiness")}</ButtonLink>
                          <ButtonLink href="/inquiry" variant="outline">
                            {common("cta.sendInquiry")}
                          </ButtonLink>
                        </div>
                      }
                    />
                  )
                ) : (
                  <>
                    <ul
                      className={
                        showCategoryFilter
                          ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
                          : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                      }
                    >
                      {list.data.items.map((article) => (
                        <ArticleCard
                          key={article.slug}
                          article={article}
                          locale={locale}
                          labels={cardLabels}
                        />
                      ))}
                    </ul>
                    <Pagination
                      className="mt-12"
                      page={list.data.page}
                      pageCount={list.data.pageCount}
                      getHref={(target) => newsListHref({ category, tag, page: target })}
                      label={common("a11y.pagination")}
                      previousLabel={common("labels.previous")}
                      nextLabel={common("labels.next")}
                      getPageLabel={(target) => common("a11y.goToPage", { page: target })}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
