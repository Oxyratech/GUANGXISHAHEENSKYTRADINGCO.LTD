import { isInquiryCategory } from "./inquiry";
import { isSlug } from "./fields";
import { FIELD_LIMITS } from "./limits";
import { cleanLine } from "./text";

/** Form values a link (typically from a product page) may set through the query string. */
export interface InquiryPrefill {
  product?: string;
  productSlug?: string;
  category?: string;
  quantity?: string;
}

interface SearchParamsLike {
  get(name: string): string | null;
}

/** Trimmed and cleaned; dropped (not truncated) when empty or over the limit. */
function boundedText(value: string | null, max: number): string | undefined {
  if (value === null) return undefined;
  const text = cleanLine(value);
  return text.length > 0 && text.length <= max ? text : undefined;
}

/**
 * Reads the query parameters an inquiry link may carry. The address bar is untrusted input, so
 * nothing is used as-is: text is cleaned and length-limited, the category must be one of ours, and
 * a product slug must look like one. Whatever fails is simply left out.
 *
 *   product      the product name to show in the form. A lowercase slug ("steel-bolts") is shown
 *                as words and also remembered as the product reference.
 *   productSlug  the product's slug, when `product` carries its name.
 *   category     a category slug, or "other".
 *   quantity     free text.
 */
export function parseInquiryPrefill(params: SearchParamsLike): InquiryPrefill {
  const prefill: InquiryPrefill = {};

  const product = boundedText(params.get("product"), FIELD_LIMITS.product.max);
  const explicitSlug = boundedText(params.get("productSlug"), FIELD_LIMITS.productSlug.max);
  const productSlug =
    explicitSlug && isSlug(explicitSlug)
      ? explicitSlug
      : product && isSlug(product)
        ? product
        : undefined;

  if (product) prefill.product = productSlug === product ? product.replaceAll("-", " ") : product;
  if (productSlug) prefill.productSlug = productSlug;

  const category = boundedText(params.get("category"), 64);
  if (category && isInquiryCategory(category)) prefill.category = category;

  const quantity = boundedText(params.get("quantity"), FIELD_LIMITS.quantity.max);
  if (quantity) prefill.quantity = quantity;

  return prefill;
}
