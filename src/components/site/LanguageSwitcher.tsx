"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type MouseEvent } from "react";
import { Check, ChevronDown, Globe } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_META, LOCALES, type Locale } from "@/i18n/locales";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { trackEvent } from "@/lib/analytics/track";
import { useAlternateLocalePaths } from "./alternate-locale-paths";

interface LanguageOption {
  readonly code: Locale;
  readonly nativeName: string;
  readonly hreflang: string;
  readonly htmlLang: string;
  /** Path of this page in that language (no locale prefix). */
  readonly path: string;
  readonly isCurrent: boolean;
  readonly onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Switching keeps the page: same pathname, or the page's own alternate path when it has one.
 * `onChosen` runs on every choice, so a menu can close itself: the click handler cancels the
 * browser's own navigation, and a cancelled click no longer closes a Radix menu item.
 */
function useLanguageOptions(onChosen: () => void): { current: Locale; options: LanguageOption[] } {
  const current = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const alternates = useAlternateLocalePaths();

  const options = LOCALES.map((code): LanguageOption => {
    const meta = LOCALE_META[code];
    const path = alternates?.[code] ?? pathname;
    return {
      code,
      nativeName: meta.nativeName,
      hreflang: meta.hreflang,
      htmlLang: meta.htmlLang,
      path,
      isCurrent: code === current,
      onClick(event) {
        onChosen();
        if (code === current) {
          event.preventDefault();
          return;
        }
        trackEvent("language_changed", { from: current, to: code });
        // Ctrl/Cmd/middle click open the other language in a new tab through the real href.
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        // Query string and hash belong to this page, so they only travel with the same pathname.
        const suffix = alternates ? "" : `${window.location.search}${window.location.hash}`;
        router.replace(`${path}${suffix}`, { locale: code });
      },
    };
  });

  return { current, options };
}

export interface LanguageSwitcherProps {
  /** "menu": a dropdown (header). "list": every language as a link (mobile menu, footer). */
  variant: "menu" | "list";
  /** Colour of the list variant: "dark" is for the navy footer. */
  tone?: "light" | "dark";
  className?: string;
}

/** Arabic names get the Arabic face even on English and Chinese pages (the page font has no Arabic). */
const ARABIC_FACE = "font-[family-name:var(--font-plex-arabic)]";
const faceFor = (code: Locale) => (code === "ar" ? ARABIC_FACE : undefined);

const LIST_ITEM_TONES = {
  light: {
    layout: "justify-between",
    base: "text-ink hover:bg-surface",
    current: "bg-surface font-semibold text-navy-900",
    check: "text-blue-600",
  },
  dark: {
    layout: "justify-start",
    base: "text-blue-100 hover:text-white",
    current: "font-semibold text-white",
    check: "text-gold-300",
  },
} as const;

/**
 * Language choice: English, 简体中文 and العربية by their own names. Each option is a real link with
 * `lang` and `hreflang`, so it also works with middle click and for crawlers. The current language
 * is marked with aria-current and named in the trigger's accessible label.
 */
export function LanguageSwitcher({ variant, tone = "light", className }: LanguageSwitcherProps) {
  const t = useTranslations("common");
  const [menuOpen, setMenuOpen] = useState(false);
  const { current, options } = useLanguageOptions(() => setMenuOpen(false));

  if (variant === "list") {
    const styles = LIST_ITEM_TONES[tone];
    return (
      <ul aria-label={t("language.label")} className={cn("grid gap-1", className)}>
        {options.map((option) => (
          <li key={option.code}>
            <Link
              href={option.path}
              locale={option.code}
              lang={option.htmlLang}
              hrefLang={option.hreflang}
              prefetch={false}
              aria-current={option.isCurrent ? "true" : undefined}
              onClick={option.onClick}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 text-small transition-colors",
                styles.layout,
                faceFor(option.code),
                option.isCurrent ? styles.current : styles.base,
              )}
            >
              {option.nativeName}
              {option.isCurrent ? (
                <Check aria-hidden className={cn("size-4 shrink-0", styles.check)} />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  const currentMeta = LOCALE_META[current];
  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={t("language.triggerLabel", { language: currentMeta.nativeName })}
          className={cn(
            "gap-1.5 px-2.5 text-small font-medium text-ink-muted hover:text-navy-900",
            className,
          )}
        >
          <Globe aria-hidden className="size-4" />
          {/* Short code on phones, the language's own name from sm. The accessible label names it in full. */}
          <span aria-hidden className="sm:hidden">
            {current.toUpperCase()}
          </span>
          <span
            aria-hidden
            lang={currentMeta.htmlLang}
            className={cn("hidden sm:inline", faceFor(current))}
          >
            {currentMeta.nativeName}
          </span>
          <ChevronDown aria-hidden className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {options.map((option) => (
          <DropdownMenuItem key={option.code} asChild>
            <Link
              href={option.path}
              locale={option.code}
              lang={option.htmlLang}
              hrefLang={option.hreflang}
              prefetch={false}
              aria-current={option.isCurrent ? "true" : undefined}
              onClick={option.onClick}
              className={cn(
                "justify-between",
                faceFor(option.code),
                option.isCurrent && "font-semibold text-navy-900",
              )}
            >
              {option.nativeName}
              {option.isCurrent ? (
                <Check aria-hidden className="size-4 shrink-0 text-blue-600" />
              ) : null}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
