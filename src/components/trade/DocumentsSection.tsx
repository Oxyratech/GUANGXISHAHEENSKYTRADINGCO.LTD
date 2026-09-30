import { getTranslations } from "next-intl/server";
import { ImageSlot } from "@/components/graphics/ImageSlot";
import { FileText } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Alert } from "@/components/ui/alert";
import type { Locale } from "@/i18n/locales";

/** Documents that international shipments typically involve. Which apply is confirmed per inquiry. */
const DOCUMENTS = ["invoice", "packing", "transport", "origin", "declarations"] as const;

export async function DocumentsSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "globalTrade" });

  return (
    <Section tone="muted" aria-labelledby="documents-title">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div className="grid content-start gap-8">
            <SectionHeading
              id="documents-title"
              eyebrow={t("overview.documents.eyebrow")}
              title={t("overview.documents.title")}
              description={t("overview.documents.description")}
            />
            <ImageSlot
              variant="documents"
              tone="light"
              alt={t("overview.documents.imageAlt")}
              width={480}
              height={360}
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="w-full max-w-md"
            />
          </div>
          <div className="grid content-start gap-6">
            <h3 className="text-h3 text-navy-900">{t("overview.documents.listTitle")}</h3>
            <dl className="divide-y divide-line rounded-lg border border-line bg-white shadow-card">
              {DOCUMENTS.map((document) => (
                <div
                  key={document}
                  className="grid gap-1.5 p-5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-6"
                >
                  <dt className="flex items-start gap-3 text-label text-navy-900">
                    <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-blue-600" />
                    {t(`overview.documents.items.${document}.name`)}
                  </dt>
                  <dd className="text-small text-ink-muted">
                    {t(`overview.documents.items.${document}.description`)}
                  </dd>
                </div>
              ))}
            </dl>
            <Alert>{t("overview.documents.note")}</Alert>
          </div>
        </div>
      </Container>
    </Section>
  );
}
