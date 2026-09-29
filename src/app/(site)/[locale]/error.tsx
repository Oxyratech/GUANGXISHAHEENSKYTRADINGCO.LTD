"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { ErrorState } from "@/components/ui/error-state";

/**
 * Error boundary for every page under a locale. The visitor gets a friendly message, a way to try
 * again and the error's digest as a support reference; the message and stack are never shown (the
 * digest is what matches the server log). The header and footer stay because the layout sits above.
 */
export default function LocaleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("errors");
  const state = {
    titleAs: "h1",
    title: t("serverError.title"),
    description: t("serverError.description"),
    action: (
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={retry}>{t("serverError.retry")}</Button>
        <ButtonLink href="/" variant="outline">
          {t("serverError.homeLink")}
        </ButtonLink>
      </div>
    ),
  } as const;

  return (
    <Section spacing="compact">
      <Container size="narrow">
        {error.digest ? (
          <ErrorState
            {...state}
            referenceId={error.digest}
            referenceLabel={t("serverError.referenceLabel")}
          />
        ) : (
          <ErrorState {...state} />
        )}
      </Container>
    </Section>
  );
}
