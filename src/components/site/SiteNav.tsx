"use client";

/*
 * Desktop primary navigation (from the xl breakpoint; below it the header shows MobileNav).
 *
 * Business and Products are real links to their index pages, so they work without JavaScript. Next
 * to each sits a button that discloses a panel of links (the WAI-ARIA "disclosure navigation"
 * pattern, not role="menu"): Enter/Space toggles, Esc closes and returns focus to the button, and
 * Tab simply continues into the panel's links. Mouse users also get hover. Every panel link is in
 * the server HTML (hidden until opened), so crawlers see them.
 */
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { ChevronDown, DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/utils";
import "@/components/ui/ui-motion.css";
import { getNavActiveState, type NavActiveState } from "@/config/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import type { NavItemModel, NavMenuLinkModel, NavMenuModel } from "./nav-types";

const HOVER_OPEN_DELAY_MS = 80;
const HOVER_CLOSE_DELAY_MS = 180;

const currentValue = (state: NavActiveState) =>
  state === "page" ? "page" : state ? "true" : undefined;

function MenuPanelLink({
  link,
  pathname,
  onNavigate,
}: {
  link: NavMenuLinkModel;
  pathname: string;
  onNavigate: () => void;
}) {
  const state = getNavActiveState(pathname, link.href);
  return (
    <Link
      href={link.href}
      aria-current={state === "page" ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "group flex min-h-11 gap-3 rounded-md p-3 transition-colors hover:bg-surface data-active:bg-surface",
        link.description ? "items-start" : "items-center",
      )}
      data-active={state === "page" ? "" : undefined}
    >
      {link.icon ? (
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100 [&_svg]:size-5"
        >
          {link.icon}
        </span>
      ) : null}
      <span className="grid min-w-0 gap-1">
        <span className="text-label text-navy-900">{link.label}</span>
        {link.description ? (
          <span className="line-clamp-2 text-small text-ink-muted">{link.description}</span>
        ) : null}
      </span>
    </Link>
  );
}

function MenuPanel({
  id,
  menu,
  open,
  pathname,
  onNavigate,
}: {
  id: string;
  menu: NavMenuModel;
  open: boolean;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div
      id={id}
      hidden={!open}
      data-state={open ? "open" : "closed"}
      className="ui-fade absolute inset-x-0 top-full border-b border-line bg-white shadow-raised"
    >
      <Container size="wide" className="py-6">
        <ul
          className={cn(
            "grid gap-x-4 gap-y-1",
            menu.links.length > 6 ? "grid-cols-4" : "grid-cols-3",
          )}
        >
          {menu.links.map((link) => (
            <li key={link.href}>
              <MenuPanelLink link={link} pathname={pathname} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-line pt-3">
          <Link
            href={menu.viewAll.href}
            onClick={onNavigate}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-small font-semibold text-blue-700 transition-colors hover:text-blue-800"
          >
            {menu.viewAll.label}
            <DirectionalIcon className="size-4" />
          </Link>
        </div>
      </Container>
    </div>
  );
}

const linkStyles =
  "relative flex h-11 items-center rounded-md text-small font-medium text-ink-muted transition-colors hover:text-navy-900 data-active:text-navy-900 " +
  "after:pointer-events-none after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:bg-gold-500 after:opacity-0 data-active:after:opacity-100";

export function SiteNav({ items }: { items: readonly NavItemModel[] }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const panelIdPrefix = useId();
  const navRef = useRef<HTMLElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // A panel is open only for the page it was opened on, so navigating closes it without an effect.
  const [opened, setOpened] = useState<{ id: string; pathname: string } | null>(null);
  const openId = opened?.pathname === pathname ? opened.id : null;

  // Set while a panel is open only because the pointer is over it.
  const hoverOpenedId = useRef<string | null>(null);

  const close = () => {
    hoverOpenedId.current = null;
    setOpened(null);
  };
  const scheduleHover = (action: () => void, delay: number) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(action, delay);
  };

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  useEffect(() => {
    if (openId === null) return undefined;
    function closeOnOutsidePress(event: PointerEvent) {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) {
        setOpened(null);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [openId]);

  function handleKeyDown(event: KeyboardEvent<HTMLLIElement>) {
    if (event.key !== "Escape" || openId === null) return;
    event.preventDefault();
    close();
    event.currentTarget.querySelector<HTMLButtonElement>("button[aria-expanded]")?.focus();
  }

  function handleBlur(event: FocusEvent<HTMLLIElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  }

  return (
    <nav
      ref={navRef}
      aria-label={t("a11y.mainNavigation")}
      className="hidden flex-1 self-stretch xl:block"
    >
      <ul className="flex h-full items-center gap-1">
        {items.map((item) => {
          const state = getNavActiveState(pathname, item.href);
          const link = (
            <Link
              href={item.href}
              aria-current={currentValue(state)}
              data-active={state ? "" : undefined}
              onClick={close}
              className={cn(linkStyles, item.menu ? "ps-3" : "px-3")}
            >
              {item.label}
            </Link>
          );

          if (!item.menu) {
            return (
              <li key={item.id} className="flex h-full items-center">
                {link}
              </li>
            );
          }

          const isOpen = openId === item.id;
          const panelId = `${panelIdPrefix}-${item.id}`;
          return (
            <li
              key={item.id}
              className="flex h-full items-center"
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") {
                  scheduleHover(() => {
                    hoverOpenedId.current = item.id;
                    setOpened({ id: item.id, pathname });
                  }, HOVER_OPEN_DELAY_MS);
                }
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") scheduleHover(close, HOVER_CLOSE_DELAY_MS);
              }}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
            >
              <div
                data-open={isOpen ? "" : undefined}
                className="flex items-center rounded-md transition-colors hover:bg-surface data-open:bg-surface"
              >
                {link}
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  aria-label={t("a11y.submenu", { name: item.label })}
                  onClick={() => {
                    clearTimeout(hoverTimer.current);
                    // The first click on a panel that hover just opened keeps it open (it was the
                    // user's intent to open it); any later click toggles.
                    const openedByHover = hoverOpenedId.current === item.id;
                    hoverOpenedId.current = null;
                    if (isOpen && !openedByHover) close();
                    else setOpened({ id: item.id, pathname });
                  }}
                  className="grid size-11 place-items-center rounded-md text-ink-subtle transition-colors hover:text-navy-900"
                >
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-4 transition-transform duration-150",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
              </div>
              <MenuPanel
                id={panelId}
                menu={item.menu}
                open={isOpen}
                pathname={pathname}
                onNavigate={close}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
