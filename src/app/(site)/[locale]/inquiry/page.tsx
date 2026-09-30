import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InquiryForm } from "@/components/forms/InquiryForm";
import { InquiryAside } from "@/components/forms/pages/InquiryAside";
import { InquiryGuidance } from "@/components/forms/pages/InquiryGuidance";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/section";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { CATEGORIES } from "@/content/categories";
import { assertLocale } from "@/i18n/assert-locale";
import { getCountryOptions } from "@/lib/countries";
import { breadcrumbJsonLd, buildMetadata, JsonLd } from "@/lib/seo";
import { CATEGORY_OTHER } from "@/lib/validation";
import { applySeoOverride, getSeoOverride } from "@/server/seo";
import { describeUploadPolicy, INQUIRY_ATTACHMENT } from "@/server/storage/policies";

const PATH = "/inquiry";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/inquiry">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "inquiry" });
  const metadata = buildMetadata({
    locale,
    path: PATH,
    title: t("meta.title"),
    description: t("meta.description"),
  });
  return applySeoOverride(metadata, await getSeoOverride({ scope: "PAGE", refKey: "inquiry", locale }));
}

export default async function InquiryPage({ params }: PageProps<"/[locale]/inquiry">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const [t, common, categories] = await Promise.all([
    getTranslations({ locale, namespace: "inquiry" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "categories" }),
  ]);

  const categoryOptions = [
    ...CATEGORIES.map(({ slug }) => ({ value: slug, label: categories(`${slug}.name`) })),
    { value: CATEGORY_OTHER, label: categories("otherCategory") },
  ];
  // Built into the static page: the type list and size shown are those of the build's environment.
  const { maxBytes, extensions } = describeUploadPolicy(INQUIRY_ATTACHMENT);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: common("nav.home"), path: "/" },
          { name: t("page.breadcrumb"), path: PATH },
        ])}
      />
      <PageHero
        breadcrumb={
          <Breadcrumb
            label={common("a11y.breadcrumb")}
            items={[
              { label: common("breadcrumb.home"), href: "/" },
              { label: t("page.breadcrumb") },
            ]}
          />
        }
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.lead")}
      />

      <Section tone="muted" spacing="compact" className="md:py-16">
        <Container>
          {/*
            Reading order is guidance, form, then what happens next, which is also the order on a
            phone. From lg the two side notes stack in the first column and the form takes the second.
          */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-10">
            <div className="lg:col-start-1 lg:row-start-1">
              <InquiryGuidance locale={locale} />
            </div>
            <Card
              as="section"
              aria-labelledby="inquiry-form-title"
              className="p-5 sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
            >
              <h2 id="inquiry-form-title" className="mb-6 text-h3 text-navy-900">
                {t("form.title")}
              </h2>
              <InquiryForm
                locale={locale}
                countries={getCountryOptions(locale)}
                categories={categoryOptions}
                upload={{ maxBytes, extensions }}
              />
            </Card>
            <div className="lg:col-start-1 lg:row-start-2">
              <InquiryAside locale={locale} />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
