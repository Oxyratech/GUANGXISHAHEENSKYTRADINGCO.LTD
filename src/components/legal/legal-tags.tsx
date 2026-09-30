import type { ReactNode } from "react";
import { SmartLink } from "@/components/ui/smart-link";
import { COMPANY } from "@/config/company";

/** Pages a legal text can link to, by the tag the message uses: `<contact>contact form</contact>`. */
const LINK_TARGETS = {
  company: "/company-information",
  contact: "/contact",
  cookies: "/cookies",
  privacy: "/privacy-policy",
  terms: "/terms",
} as const;

const LINK_CLASS =
  "font-medium text-blue-600 underline decoration-blue-300 underline-offset-4 hover:decoration-blue-600";

const linkTags = Object.fromEntries(
  (Object.keys(LINK_TARGETS) as (keyof typeof LINK_TARGETS)[]).map((tag) => [
    tag,
    (chunks: ReactNode) => (
      <SmartLink href={LINK_TARGETS[tag]} className={LINK_CLASS}>
        {chunks}
      </SmartLink>
    ),
  ]),
);

/**
 * Everything a legal message may use besides plain text: the company's registered details, links,
 * the language of a registered name, and `<tbc>[...]</tbc>`, a decision the company still has to
 * confirm. A placeholder is marked in the page so it cannot be mistaken for finished text, and
 * keeps its square brackets so it survives being printed or copied.
 */
export const LEGAL_RICH_VALUES = {
  legalName: COMPANY.legalNameEn,
  legalNameZh: COMPANY.legalNameZh,
  address: COMPANY.registeredAddressZh,
  ...linkTags,
  en: (chunks: ReactNode) => (
    <bdi lang="en" dir="ltr">
      {chunks}
    </bdi>
  ),
  zh: (chunks: ReactNode) => <bdi lang="zh-CN">{chunks}</bdi>,
  tbc: (chunks: ReactNode) => (
    <mark
      data-legal-placeholder=""
      className="rounded-xs border-b border-dashed border-gold-600 bg-gold-100 px-1 text-navy-900"
    >
      {chunks}
    </mark>
  ),
};
