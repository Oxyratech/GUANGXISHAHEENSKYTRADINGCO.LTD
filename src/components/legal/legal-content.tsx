import { createTranslator } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/locales";
import type { LegalDocKey } from "./legal-outline";
import { LEGAL_RICH_VALUES } from "./legal-tags";

export interface LegalSection {
  /** Element id of the section's heading, the target of the table of contents. */
  readonly id: string;
  readonly title: string;
  readonly content: ReactNode;
}

type SectionMessages = Readonly<Record<string, string | Readonly<Record<string, string>>>>;

type Block =
  | { readonly kind: "paragraph"; readonly key: string }
  | { readonly kind: "list"; readonly keys: readonly string[] };

/**
 * Turns `legal.<doc>.sections` into page sections, in the order the messages list them. A section
 * is an object: `title`, then its blocks in order. A string is a paragraph and an object of
 * strings is a bulleted list, so the text can be reviewed and reworded in the message files alone
 * (an unnoticed reordering is caught by the key-order test). `extras` adds a component, such as a
 * table, at the end of the section with that id.
 */
export async function buildLegalSections(
  locale: Locale,
  doc: LegalDocKey,
  extras: Readonly<Record<string, ReactNode>> = {},
): Promise<LegalSection[]> {
  const messages = await getMessages({ locale });
  const source: Readonly<Record<string, SectionMessages>> = messages.legal[doc].sections;

  // One translator over flat, dot-free keys ("collected__list1__i1") formats every block.
  const flat: Record<string, string> = {};
  const outline = Object.entries(source).map(([id, section]) => {
    const { title, ...body } = section;
    if (typeof title !== "string") throw new Error(`legal.${doc}.sections.${id}.title is not text`);

    const blocks = Object.entries(body).map<Block>(([name, value]) => {
      if (typeof value === "string") {
        flat[`${id}__${name}`] = value;
        return { kind: "paragraph", key: `${id}__${name}` };
      }
      const keys = Object.entries(value).map(([item, text]) => {
        flat[`${id}__${name}__${item}`] = text;
        return `${id}__${name}__${item}`;
      });
      return { kind: "list", keys };
    });
    return { id, title, blocks };
  });

  const orphan = Object.keys(extras).find((id) => !(id in source));
  if (orphan) throw new Error(`legal.${doc} has no section "${orphan}" to attach content to`);

  const t = createTranslator({ locale, messages: flat });

  return outline.map(({ id, title, blocks }) => ({
    id,
    title,
    content: (
      <>
        {blocks.map((block) =>
          block.kind === "paragraph" ? (
            <p key={block.key}>{t.rich(block.key, LEGAL_RICH_VALUES)}</p>
          ) : (
            <ul key={block.keys.join()}>
              {block.keys.map((key) => (
                <li key={key}>{t.rich(key, LEGAL_RICH_VALUES)}</li>
              ))}
            </ul>
          ),
        )}
        {extras[id]}
      </>
    ),
  }));
}
