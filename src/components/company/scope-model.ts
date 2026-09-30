import { getTranslations } from "next-intl/server";
import { getScopeItemsByGroup, SCOPE_GROUPS, type ScopeGroup } from "@/config/business-scope";
import { getCategory, type IconName } from "@/content/categories";
import type { Locale } from "@/i18n/locales";
import type { Messages } from "@/i18n/messages";

type ScopeItemKey = keyof Messages["scope"]["items"];

export interface ScopeItemModel {
  readonly id: string;
  /** The reader's wording: the license text itself in zh, the unofficial translation otherwise. */
  readonly text: string;
  /** Official license wording. */
  readonly zh: string;
}

export interface ScopeGroupModel {
  readonly group: ScopeGroup;
  readonly name: string;
  readonly description: string;
  readonly items: readonly ScopeItemModel[];
}

/** The registered scope, grouped and worded for one locale. Reads the shared `scope` namespace. */
export async function loadScopeGroups(locale: Locale): Promise<ScopeGroupModel[]> {
  const t = await getTranslations({ locale, namespace: "scope" });
  return SCOPE_GROUPS.map((group) => ({
    group,
    name: t(`groups.${group}.name`),
    description: t(`groups.${group}.description`),
    items: getScopeItemsByGroup(group).map((item) => ({
      id: item.id,
      zh: item.zh,
      // Ids are plain strings in the registry; the catalogue test guarantees a message for each.
      text: locale === "zh" ? item.zh : t(`items.${item.id as ScopeItemKey}`),
    })),
  }));
}

/** Category groups reuse their category icon; the trade and agency group has no category. */
export function getScopeGroupIcon(group: ScopeGroup): IconName {
  return getCategory(group)?.icon ?? "Globe";
}
