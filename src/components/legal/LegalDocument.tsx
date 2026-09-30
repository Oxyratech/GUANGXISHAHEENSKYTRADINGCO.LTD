import type { ReactNode } from "react";
import { ChevronDown } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Prose } from "@/components/layout/prose";
import type { LegalSection } from "./legal-content";
import { PrintButton } from "./PrintButton";
import "./legal-print.css";

export interface LegalDocumentProps {
  sections: readonly LegalSection[];
  /** The legal review status notice: it always comes first, before any legal text. */
  review: { title: string; body: ReactNode };
  /** "Last updated: <time>…</time>", already formatted. */
  updated: ReactNode;
  tocTitle: string;
  printLabel: string;
}

/**
 * A long legal text: the review-status notice, the date it was last updated, a table of contents
 * (a column beside the text from lg) and the sections in the site's long-form typography. Every
 * section heading carries an id, so a section can be linked to and the table of contents works
 * without a script. On paper the table of contents and the print button drop out and the site
 * header and footer are hidden (legal-print.css).
 */
export function LegalDocument({
  sections,
  review,
  updated,
  tocTitle,
  printLabel,
}: LegalDocumentProps) {
  return (
    <div data-legal-document className="grid gap-8">
      <Alert variant="warning" role="note" title={review.title} className="max-w-3xl">
        {review.body}
      </Alert>

      <div className="flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line pb-4">
        <p className="text-small text-ink-muted">{updated}</p>
        <PrintButton label={printLabel} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 print:block">
        <nav aria-label={tocTitle} className="lg:sticky lg:top-28 lg:self-start print:hidden">
          {/* A collapsed disclosure on a phone, where thirteen links would push the text far down;
              from lg the list is always shown (details-content), beside the text. */}
          <details className="group lg:[&::details-content]:[content-visibility:visible]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-line bg-white px-4 text-label text-navy-900 lg:hidden [&::-webkit-details-marker]:hidden">
              {tocTitle}
              <ChevronDown
                aria-hidden
                className="size-5 shrink-0 text-ink-subtle transition-transform group-open:rotate-180"
              />
            </summary>
            <p aria-hidden className="hidden text-eyebrow text-ink-subtle lg:block">
              {tocTitle}
            </p>
            <ul className="mt-3 grid sm:grid-cols-2 lg:grid-cols-1 lg:border-s lg:border-line">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex min-h-11 items-center text-small text-ink-muted transition-colors hover:text-navy-900 hover:underline lg:-ms-px lg:min-h-9 lg:border-s-2 lg:border-transparent lg:ps-4 lg:hover:border-navy-600"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </nav>

        <div className="max-w-3xl min-w-0">
          {sections.map((section) => (
            <section key={section.id} className="mt-12 first:mt-0 print:break-inside-avoid">
              <h2 id={section.id} className="mb-4 text-h3 text-navy-900 print:break-after-avoid">
                {section.title}
              </h2>
              <Prose className="max-w-none">{section.content}</Prose>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
