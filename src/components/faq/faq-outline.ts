import type { Messages } from "@/i18n/messages";

/**
 * Which questions the FAQ asks and in what order. The words live in the `faq` namespace
 * (`groups.<id>`, `items.<id>.question|answer`); a question's id is also its address: `/faq#prices`.
 */
export type FaqGroupId = keyof Messages["faq"]["groups"];
export type FaqItemId = keyof Messages["faq"]["items"];

export interface FaqGroupDefinition {
  readonly id: FaqGroupId;
  readonly items: readonly FaqItemId[];
}

export const FAQ_GROUPS: readonly FaqGroupDefinition[] = [
  { id: "company", items: ["registered", "location", "manufacturer"] },
  { id: "products", items: ["sourcing", "categories", "regulated"] },
  {
    id: "inquiries",
    items: ["submit", "include", "attachments", "contact", "prices", "languages"],
  },
  { id: "shipping", items: ["process", "documentation", "shipping"] },
];

/** Groups are prefixed so that a group id can never collide with a question id (`shipping`). */
export function faqGroupAnchor(id: FaqGroupId): string {
  return `group-${id}`;
}
