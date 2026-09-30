"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while the list reads the database. Client component because loading files receive no
 * params, so it can only translate through the client provider ("errors" is one of its namespaces).
 * It is scoped to the list (route group "(list)"): an article that does not exist must still answer 404.
 */
export default function NewsLoading() {
  const t = useTranslations("errors");

  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        {t("loading.label")}
      </p>
      <div className="border-b border-line bg-surface">
        <Container>
          <div className="grid gap-4 py-10 md:py-14">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>
        </Container>
      </div>
      <Section>
        <Container>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="grid gap-4 rounded-lg border border-line p-6">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-16 w-full" />
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </div>
  );
}
