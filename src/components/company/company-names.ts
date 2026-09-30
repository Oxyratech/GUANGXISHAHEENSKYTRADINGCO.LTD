import { COMPANY } from "@/config/company";
import { COMPANY_DISPLAY_NAME } from "@/lib/seo";

/**
 * The `{name}` and `{nameZh}` values of the company messages: the English name in title case (the
 * legal name is upper case on documents) and the Chinese legal name.
 */
export const COMPANY_NAME_VALUES = {
  name: COMPANY_DISPLAY_NAME,
  nameZh: COMPANY.legalNameZh,
} as const;
