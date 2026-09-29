"use client";

/*
 * Navigation below the xl breakpoint: a menu button that opens a right-hand drawer (Radix dialog:
 * focus trap, Esc, scroll lock, focus returns to the button). The drawer holds the full
 * navigation, with Business and Products expandable in place, the language list and, pinned at
 * the bottom where a thumb reaches it, the inquiry call to action. It closes when the route changes.
 */
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { ChevronDown, DirectionalIcon, Menu } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";
import { Drawer } from "@/components/ui/drawer";
import { getNavActiveState, type NavActiveState } from "@/config/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { NavItemModel, SiteNavModel } from "./nav-types";

const currentValue = (state: NavActiveState) =>
  state === "page" ? "page" : state ? "true" : undefined;

const rowStyles =
  "flex min-h-12 flex-1 items-center rounded-md px-3 text-body font-medium text-navy-900 transition-colors data-active:font-semibold";
const subLinkStyles =
  "flex min-h-11 items-center rounded-md px-3 text-small text-ink transition-colors hover:bg-surface data-active:bg-surface data-active:font-semibold data-active:text-navy-900";

function MobileNavItem({
  item,
  pathname,
  expanded,
  onToggle,
  onNavigate,
}: {
  item: NavItemModel;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const t = useTranslations("common");
  const panelId = useId();
  const state = getNavActiveState(pathname, item.href);

  return (
    <li className="border-b border-line last:border-b-0">
      {/* The highlight covers the whole row, link and expand button together. */}
      <div
        data-active={state ? "" : undefined}
        className="flex items-center rounded-md transition-colors hover:bg-surface data-active:bg-surface"
      >
        <Link
          href={item.href}
          aria-current={currentValue(state)}
          data-active={state ? "" : undefined}
          onClick={onNavigate}
          className={rowStyles}
        >
          {item.label}
        </Link>
        {item.menu ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={t("a11y.submenu", { name: item.label })}
            onClick={onToggle}
            className="grid size-12 shrink-0 place-items-center rounded-md text-ink-subtle transition-colors hover:text-navy-900"
          >
            <ChevronDown
              aria-hidden
              className={cn("size-5 transition-transform duration-150", expanded && "rotate-180")}
            />
          </button>
        ) : null}
      </div>
      {item.menu ? (
        <ul id={panelId} hidden={!expanded} className="grid gap-0.5 ps-3 pb-3">
          {item.menu.links.map((link) => {
            const linkState = getNavActiveState(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={linkState === "page" ? "page" : undefined}
                  data-active={linkState === "page" ? "" : undefined}
                  onClick={onNavigate}
                  className={subLinkStyles}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href={item.menu.viewAll.href}
              onClick={onNavigate}
              className={cn(subLinkStyles, "gap-2 font-semibold text-blue-700")}
            >
              {item.menu.viewAll.label}
              <DirectionalIcon className="size-4" />
            </Link>
          </li>
        </ul>
      ) : null}
    </li>
  );
}

export function MobileNav({ items, inquiry }: SiteNavModel) {
  const t = useTranslations("common");
  const pathname = usePathname();
  // Open only for the page it was opened on: navigating closes it without an effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const open = openedOn === pathname;
  const close = () => setOpenedOn(null);

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => setOpenedOn(next ? pathname : null)}
      side="end"
      trigger={
        <Button variant="ghost" size="icon" aria-label={t("a11y.openMenu")} className="xl:hidden">
          <Menu aria-hidden />
        </Button>
      }
      title={t("a11y.menuTitle")}
      description={t("a11y.menuDescription")}
      hideDescription
      closeLabel={t("a11y.closeMenu")}
      footer={
        <ButtonLink href={inquiry.href} size="lg" className="w-full" onClick={close}>
          {inquiry.label}
          <DirectionalIcon />
        </ButtonLink>
      }
    >
      <nav aria-label={t("a11y.mainNavigation")}>
        <ul>
          {items.map((item) => (
            <MobileNavItem
              key={item.id}
              item={item}
              pathname={pathname}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId((current) => (current === item.id ? null : item.id))}
              onNavigate={close}
            />
          ))}
        </ul>
      </nav>
      <div className="mt-6 border-t border-line pt-5">
        <p className="mb-2 px-3 text-eyebrow text-ink-subtle">{t("language.label")}</p>
        <LanguageSwitcher variant="list" />
      </div>
    </Drawer>
  );
}
