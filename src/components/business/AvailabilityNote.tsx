import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import type { Locale } from "@/i18n/locales";
import { Callout } from "./Callout";

/** The honest limit that closes every business line: availability depends on product, supplier and law. */
export async function AvailabilityNote({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "business" });
  return (
    <Section spacing="compact" className="pt-0 md:pt-0">
      <Container>
        <Callout title={t("shared.availability.title")} titleAs="h2" className="max-w-4xl">
          {t("shared.availability.text")}
        </Callout>
      </Container>
    </Section>
  );
}
