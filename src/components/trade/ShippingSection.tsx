import { getTranslations } from "next-intl/server";
import { ImageSlot } from "@/components/graphics/ImageSlot";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import type { Locale } from "@/i18n/locales";

const POINTS = ["handover", "formalities", "updates"] as const;

/** Shipping and export as coordination support: no carriers, routes, transit times or rates. */
export async function ShippingSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "globalTrade" });

  return (
    <Section aria-labelledby="shipping-title">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="grid gap-8">
            <SectionHeading
              id="shipping-title"
              eyebrow={t("overview.shipping.eyebrow")}
              title={t("overview.shipping.title")}
              description={t("overview.shipping.description")}
            />
            <div className="grid gap-4">
              <h3 className="text-label text-navy-900">{t("overview.shipping.pointsTitle")}</h3>
              <ul role="list" className="grid gap-4">
                {POINTS.map((point) => (
                  <li key={point} className="border-s-2 border-gold-400 ps-4 text-body text-ink">
                    {t(`overview.shipping.points.${point}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <ImageSlot
            variant="shipment"
            alt={t("overview.shipping.imageAlt")}
            width={480}
            height={360}
            sizes="(min-width: 1024px) 45vw, 90vw"
            className="w-full lg:order-first"
          />
        </div>
      </Container>
    </Section>
  );
}
