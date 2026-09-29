import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/lib/analytics/track";
import { AlternateLocalePaths } from "./alternate-locale-paths";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { installDomPolyfills, navigation, renderWithIntl, resetNavigation } from "./test-utils";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);
vi.mock("@/lib/analytics/track", () => ({ trackEvent: vi.fn() }));

beforeAll(installDomPolyfills);
beforeEach(() => {
  resetNavigation("/business/import-export");
  vi.mocked(trackEvent).mockClear();
  window.history.replaceState(null, "", "/en/business/import-export");
});

const NATIVE_NAMES = ["English", "简体中文", "العربية"];

describe("LanguageSwitcher list", () => {
  it("offers the three languages by their own names, each with lang and hreflang", () => {
    renderWithIntl(<LanguageSwitcher variant="list" />);

    const links = within(screen.getByRole("list", { name: "Language" })).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(NATIVE_NAMES);
    expect(links.map((link) => link.getAttribute("lang"))).toEqual(["en", "zh-CN", "ar"]);
    expect(links.map((link) => link.getAttribute("hreflang"))).toEqual(["en", "zh-CN", "ar"]);
  });

  it("keeps the current page: every option points at the same pathname in its language", () => {
    renderWithIntl(<LanguageSwitcher variant="list" />);

    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/en/business/import-export",
      "/zh/business/import-export",
      "/ar/business/import-export",
    ]);
  });

  it("marks only the current language", () => {
    renderWithIntl(<LanguageSwitcher variant="list" />, "zh");

    expect(screen.getByRole("link", { name: "简体中文" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "English" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "العربية" })).not.toHaveAttribute("aria-current");
  });

  it("switches with the locale-aware router, keeping pathname, query and hash", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/en/business/import-export?page=2#details");
    renderWithIntl(<LanguageSwitcher variant="list" />);

    await user.click(screen.getByRole("link", { name: "العربية" }));

    expect(navigation.replace).toHaveBeenCalledWith("/business/import-export?page=2#details", {
      locale: "ar",
    });
  });

  it("reports the change to analytics as a language pair, nothing else", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher variant="list" />);

    await user.click(screen.getByRole("link", { name: "简体中文" }));

    expect(trackEvent).toHaveBeenCalledWith("language_changed", { from: "en", to: "zh" });
  });

  it("lets a modified click open the other language in a new tab", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher variant="list" />);
    // jsdom cannot open a tab; swallow the browser's default action after React has seen the click.
    document.addEventListener("click", (event) => event.preventDefault(), { once: true });

    await user.keyboard("{Control>}");
    await user.click(screen.getByRole("link", { name: "简体中文" }));
    await user.keyboard("{/Control}");

    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("does nothing when the current language is chosen again", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher variant="list" />);

    await user.click(screen.getByRole("link", { name: "English" }));

    expect(navigation.replace).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("follows the alternate paths a page registers", () => {
    renderWithIntl(
      <>
        <AlternateLocalePaths
          paths={{ en: "/news/first-shipment", zh: "/news/shou-pi", ar: "/news" }}
        />
        <LanguageSwitcher variant="list" />
      </>,
    );

    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/en/news/first-shipment",
      "/zh/news/shou-pi",
      "/ar/news",
    ]);
  });

  it("forgets the alternates when the page that registered them goes away", () => {
    const { rerender } = render(
      <NextIntlClientProvider
        locale="en"
        messages={{ common: { language: { label: "Language" } } }}
      >
        <AlternateLocalePaths paths={{ en: "/news/a", zh: "/news/b", ar: "/news" }} />
        <LanguageSwitcher variant="list" />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByRole("link")[1]).toHaveAttribute("href", "/zh/news/b");

    rerender(
      <NextIntlClientProvider
        locale="en"
        messages={{ common: { language: { label: "Language" } } }}
      >
        <LanguageSwitcher variant="list" />
      </NextIntlClientProvider>,
    );

    expect(screen.getAllByRole("link")[1]).toHaveAttribute("href", "/zh/business/import-export");
  });
});

describe("LanguageSwitcher menu", () => {
  it("names the current language on its trigger", () => {
    renderWithIntl(<LanguageSwitcher variant="menu" />, "ar");

    expect(
      screen.getByRole("button", { name: "اللغة: العربية. تغيير اللغة." }),
    ).toBeInTheDocument();
  });

  it("opens from the keyboard and lists the languages as links with lang and hreflang", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher variant="menu" />);
    screen.getByRole("button", { name: /Language: English/ }).focus();

    await user.keyboard("{Enter}");

    const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(NATIVE_NAMES);
    expect(items.map((item) => item.getAttribute("lang"))).toEqual(["en", "zh-CN", "ar"]);
    expect(items.map((item) => item.getAttribute("hreflang"))).toEqual(["en", "zh-CN", "ar"]);
    expect(items[0]).toHaveAttribute("aria-current", "true");
  });

  it("switches language with the keyboard and Enter", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher variant="menu" />);
    screen.getByRole("button", { name: /Language: English/ }).focus();

    await user.keyboard("{Enter}{ArrowDown}{Enter}");

    expect(navigation.replace).toHaveBeenCalledWith("/business/import-export", { locale: "zh" });
    expect(trackEvent).toHaveBeenCalledWith("language_changed", { from: "en", to: "zh" });
  });

  it("closes when the current language is chosen again, and does not navigate", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher variant="menu" />);
    const trigger = screen.getByRole("button", { name: /Language: English/ });
    await user.click(trigger);

    await user.click(screen.getByRole("menuitem", { name: "English" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("closes when another language is chosen", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher variant="menu" />);
    await user.click(screen.getByRole("button", { name: /Language: English/ }));

    await user.click(screen.getByRole("menuitem", { name: "العربية" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(navigation.replace).toHaveBeenCalledWith("/business/import-export", { locale: "ar" });
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher variant="menu" />);
    const trigger = screen.getByRole("button", { name: /Language: English/ });
    trigger.focus();

    await user.keyboard("{Enter}");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
