import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cache, type ReactNode } from "react";
import { ImageSlot } from "@/components/graphics/ImageSlot";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { AlternateLocalePaths } from "@/components/site/alternate-locale-paths";
import { ArticleBody } from "@/components/news/ArticleBody";
import { ArticleCard } from "@/components/news/ArticleCard";
import { ArticleMeta } from "@/components/news/ArticleMeta";
import { newsArticlePath, newsListHref } from "@/components/news/hrefs";
import { parseArticleSlug } from "@/components/news/list-params";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button-link";
import { ErrorState } from "@/components/ui/error-state";
import { assertLocale } from "@/i18n/assert-locale";
import { LOCALES, type Locale } from "@/i18n/locales";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildMetadata,
  JsonLd,
  newsArticleJsonLd,
  type PathsByLocale,
} from "@/lib/seo";
import { getPublishedArticle, type NewsImage, type PublishedArticle } from "@/server/news";

/**
 * Rendered per request, never cached as a page: a cached page could freeze a "database
 * unavailable" answer, or an article that was just unpublished. The read behind it is cached for
 * five minutes and expired by tag when an editor publishes (see @/server/news).
 */
export const dynamic = "force-dynamic";

/** generateMetadata and the page share one read per request. */
const loadArticle = cache((locale: Locale, slug: string) => getPublishedArticle({ locale, slug }));

/** Where the story lives in each language that has it; the others point at the news list. */
function languagePaths(article: PublishedArticle): PathsByLocale {
  return Object.fromEntries(
    LOCALES.flatMap((locale) => {
      const slug = article.alternates[locale];
      return slug === undefined ? [] : [[locale, newsArticlePath(slug)]];
    }),
  );
}

function switcherPaths(paths: PathsByLocale): Record<Locale, string> {
  return Object.fromEntries(LOCALES.map((locale) => [locale, paths[locale] ?? "/news"])) as Record<
    Locale,
    string
  >;
}

const seoImage = (image: NewsImage, fallbackAlt: string) => ({
  url: image.src,
  alt: image.alt ?? fallbackAlt,
  ...(image.width && image.height ? { width: image.width, height: image.height } : {}),
});

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/news/[slug]">): Promise<Metadata> {
  const { locale: rawLocale, slug: rawSlug } = await params;
  const locale = assertLocale(rawLocale);
  setRequestLocale(locale);
  const slug = parseArticleSlug(rawSlug);
  if (!slug) notFound();

  const result = await loadArticle(locale, slug);
  if (result.status === "unavailable") {
    const t = await getTranslations({ locale, namespace: "news" });
    return buildMetadata({
      locale,
      path: "/news",
      title: t("meta.title"),
      description: t("meta.description"),
      noIndex: true,
    });
  }

  const article = result.data;
  if (!article) notFound();
  const { seo } = article;
  const image = seo?.image ?? article.cover;

  return buildMetadata({
    locale,
    path: newsArticlePath(article.slug),
    title: seo?.title ?? article.title,
    description: seo?.description ?? article.summary,
    type: "article",
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
    noIndex: seo?.noIndex ?? false,
    // hreflang only for the language versions that exist.
    alternatePaths: languagePaths(article),
    ...(image ? { image: seoImage(image, article.title) } : {}),
  });
}

export default async function NewsArticlePage({ params }: PageProps<"/[locale]/news/[slug]">) {
  const { locale: rawLocale, slug: rawSlug } = await params;
  const locale = assertLocale(rawLocale);
  setRequestLocale(locale);
  const slug = parseArticleSlug(rawSlug);
  if (!slug) notFound();

  const [t, common, errors, result] = await Promise.all([
    getTranslations({ locale, namespace: "news" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "errors" }),
    loadArticle(locale, slug),
  ]);

  if (result.status === "unavailable") {
    return (
      <>
        {/* Which languages have this story is unknown right now: the switcher goes to the list. */}
        <AlternateLocalePaths paths={switcherPaths({})} />
        <Section>
          <Container size="narrow">
            <ErrorState
              titleAs="h1"
              title={t("unavailable.title")}
              description={errors("databaseUnavailable")}
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <ButtonLink href={newsArticlePath(slug)} variant="outline">
                    {common("labels.retry")}
                  </ButtonLink>
                  <ButtonLink href={newsListHref()} variant="ghost">
                    {t("article.backToNews")}
                  </ButtonLink>
                </div>
              }
            />
          </Container>
        </Section>
      </>
    );
  }

  const article = result.data;
  if (!article) notFound();

  const path = newsArticlePath(article.slug);
  const labels = {
    published: t("article.published"),
    category: t("article.category"),
    tags: t("article.tags"),
  };
  const byline: ReactNode = article.authorName
    ? t.rich("article.byline", {
        name: article.authorName,
        author: (chunks) => <bdi className="font-medium text-navy-900">{chunks}</bdi>,
      })
    : null;
  const cover = article.cover;
  const newsTitle = common("nav.news");

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, [
            { name: common("breadcrumb.home"), path: "/" },
            { name: newsTitle, path: "/news" },
            { name: article.title, path },
          ]),
          newsArticleJsonLd({
            locale,
            path,
            headline: article.title,
            description: article.summary,
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
            authorName: article.authorName,
            ...(cover ? { imageUrl: absoluteUrl(cover.src) } : {}),
          }),
        ]}
      />
      <AlternateLocalePaths paths={switcherPaths(languagePaths(article))} />

      <article>
        <PageHero
          eyebrow={article.category?.name ?? newsTitle}
          title={article.title}
          description={article.summary}
          breadcrumb={
            <Breadcrumb
              label={common("a11y.breadcrumb")}
              items={[
                { label: common("breadcrumb.home"), href: "/" },
                { label: newsTitle, href: "/news" },
                { label: article.title },
              ]}
            />
          }
        />

        <Section spacing="compact">
          <Container size="narrow">
            <ArticleMeta
              locale={locale}
              publishedAt={article.publishedAt}
              byline={byline}
              category={article.category}
              tags={article.tags}
              labels={labels}
            />

            {cover ? (
              <div className="mt-8">
                {cover.width && cover.height ? (
                  <ImageSlot
                    priority
                    src={cover.src}
                    alt={cover.alt ?? article.title}
                    width={cover.width}
                    height={cover.height}
                    sizes="(min-width: 768px) 768px, 100vw"
                  />
                ) : (
                  <ImageSlot
                    priority
                    fill
                    src={cover.src}
                    alt={cover.alt ?? article.title}
                    sizes="(min-width: 768px) 768px, 100vw"
                    className="aspect-video"
                  />
                )}
              </div>
            ) : null}

            <ArticleBody
              className="mt-8"
              markdown={article.content}
              images={article.bodyImages}
              labels={{ opensInNewTab: common("a11y.opensInNewTab") }}
            />

            <div className="mt-12 border-t border-line pt-6">
              <ButtonLink href={newsListHref()} variant="link" className="min-h-11">
                <DirectionalIcon direction="back" />
                {t("article.backToNews")}
              </ButtonLink>
            </div>
          </Container>
        </Section>
      </article>

      {article.related.length > 0 ? (
        <Section tone="muted" aria-labelledby="related-news-heading">
          <Container>
            <SectionHeading id="related-news-heading" title={t("article.related.heading")} />
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {article.related.map((related) => (
                <ArticleCard
                  key={related.slug}
                  article={related}
                  locale={locale}
                  labels={{ ...labels, readArticle: t("list.readArticle") }}
                />
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <Section tone="navy" aria-labelledby="news-cta-heading">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16">
            <SectionHeading
              id="news-cta-heading"
              eyebrow={t("article.cta.eyebrow")}
              title={t("article.cta.title")}
              description={t("article.cta.description")}
            />
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/inquiry" variant="inverse" size="lg">
                {common("cta.sendInquiry")}
                <DirectionalIcon />
              </ButtonLink>
              <ButtonLink href="/business" variant="outline-inverse" size="lg">
                {common("cta.exploreBusiness")}
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
