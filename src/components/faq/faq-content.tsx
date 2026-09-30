import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { SmartLink } from "@/components/ui/smart-link";
import { COMPANY } from "@/config/company";
import { CATEGORIES } from "@/content/categories";
import type { Locale } from "@/i18n/locales";
import type { FaqEntry } from "@/lib/seo";
import type { FaqGroupView } from "./FaqAccordion";
import { FAQ_GROUPS, faqGroupAnchor } from "./faq-outline";

/** Pages an answer can link to, by the tag the message uses: `<inquiry>inquiry form</inquiry>`. */
const LINK_TARGETS = {
  company: "/company-information",
  contact: "/contact",
  inquiry: "/inquiry",
  process: "/global-trade/how-it-works",
  products: "/products",
} as const;

const LINK_CLASS =
  "font-medium text-blue-600 underline decoration-blue-300 underline-offset-4 hover:decoration-blue-600";

const LINK_TAGS = Object.keys(LINK_TARGETS) as (keyof typeof LINK_TARGETS)[];

/** Facts an answer can state, read from the company registry so the copy never drifts from it. */
const FACTS = {
  count: CATEGORIES.length,
  legalName: COMPANY.legalNameEn,
  legalNameZh: COMPANY.legalNameZh,
};

const richValues = {
  ...FACTS,
  ...Object.fromEntries(
    LINK_TAGS.map((tag) => [
      tag,
      (chunks: ReactNode) => (
        <SmartLink href={LINK_TARGETS[tag]} className={LINK_CLASS}>
          {chunks}
        </SmartLink>
      ),
    ]),
  ),
  // Registered names are never translated: they keep their own language and direction.
  en: (chunks: ReactNode) => (
    <bdi lang="en" dir="ltr">
      {chunks}
    </bdi>
  ),
  zh: (chunks: ReactNode) => <bdi lang="zh-CN">{chunks}</bdi>,
};

/** The same message as plain text, for the FAQPage structured data. */
const plainValues = {
  ...FACTS,
  ...Object.fromEntries([...LINK_TAGS, "en", "zh"].map((tag) => [tag, (chunks: string) => chunks])),
};

/**
 * The FAQ from the `faq` messages: the groups with rich answers for the page, and the same
 * questions with plain-text answers for structured data, so both always say the same thing.
 */
export async function getFaqContent(
  locale: Locale,
): Promise<{ groups: FaqGroupView[]; entries: FaqEntry[] }> {
  const t = await getTranslations({ locale, namespace: "faq" });

  const groups = FAQ_GROUPS.map((group) => ({
    id: group.id,
    anchorId: faqGroupAnchor(group.id),
    title: t(`groups.${group.id}`),
    items: group.items.map((id) => ({
      id,
      question: t(`items.${id}.question`),
      answer: t.rich(`items.${id}.answer`, richValues),
    })),
  }));

  const entries = FAQ_GROUPS.flatMap((group) => group.items).map((id) => ({
    question: t(`items.${id}.question`),
    answer: t.markup(`items.${id}.answer`, plainValues),
  }));

  return { groups, entries };
}
