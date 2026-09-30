import { PatternGrid } from "@/components/graphics/PatternGrid";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button-link";

interface CtaAction {
  label: string;
  href: string;
}

/**
 * Closing call to action: a navy panel inside a white section, so it stays distinct from the navy
 * footer that follows it. `data-tone="navy"` switches SectionHeading to light text.
 */
export function CtaBand({
  title,
  description,
  primary,
  secondary,
  headingId,
}: {
  title: string;
  description: string;
  primary: CtaAction;
  secondary: CtaAction;
  headingId: string;
}) {
  return (
    <Section spacing="compact" aria-labelledby={headingId}>
      <Container>
        <div
          data-tone="navy"
          className="group/tone relative isolate overflow-hidden rounded-lg bg-navy-900 px-6 py-10 text-white md:px-12 md:py-14"
        >
          <PatternGrid tone="navy" variant="dots" className="-z-10 opacity-40" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16">
            <SectionHeading id={headingId} title={title} description={description} />
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href={primary.href} variant="inverse" size="lg">
                {primary.label}
                <DirectionalIcon />
              </ButtonLink>
              <ButtonLink href={secondary.href} variant="outline-inverse" size="lg">
                {secondary.label}
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
