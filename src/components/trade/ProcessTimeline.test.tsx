import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TRADE_PROCESS_STEPS } from "@/content/process";
import { LOCALES } from "@/i18n/locales";
import { ProcessTimeline } from "./ProcessTimeline";
import { MESSAGES, setRequestLocaleForTest } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);

const NUMERALS = ["01", "02", "03", "04", "05", "06", "07", "08"];

describe.each(LOCALES)("ProcessTimeline in %s", (locale) => {
  const copy = MESSAGES[locale].globalTrade.process;

  it("lists the eight steps in order, numbered 01 to 08, under the typical-process label", async () => {
    render(await ProcessTimeline({ locale }));

    const list = screen.getByRole("list", { name: copy.label });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(TRADE_PROCESS_STEPS.length);
    items.forEach((item, index) => {
      expect(within(item).getByText(NUMERALS[index]!)).toBeInTheDocument();
      const title = copy[TRADE_PROCESS_STEPS[index]!].title;
      expect(within(item).getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    });
  });

  it("says that the flow is typical and not a fixed procedure", async () => {
    render(await ProcessTimeline({ locale }));

    expect(screen.getByText(copy.label)).toBeInTheDocument();
    expect(screen.getByText(copy.note)).toBeInTheDocument();
  });

  it("keeps the compact variant to the title and the summary of each step", async () => {
    const { container } = render(await ProcessTimeline({ variant: "compact", locale }));

    for (const step of TRADE_PROCESS_STEPS) {
      expect(screen.getByText(copy[step].summary)).toBeInTheDocument();
      expect(screen.queryByText(copy[step].detail)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(copy.provideLabel)).not.toBeInTheDocument();
    expect(container.querySelector("[id^='step-']")).toBeNull();
  });

  it("adds the detail, what you provide and what we typically do in the detailed variant", async () => {
    render(await ProcessTimeline({ variant: "detailed", locale }));

    for (const step of TRADE_PROCESS_STEPS) {
      expect(screen.getByText(copy[step].detail)).toBeInTheDocument();
      for (const key of ["a", "b", "c"] as const) {
        expect(screen.getByText(copy[step].provide[key])).toBeInTheDocument();
        expect(screen.getByText(copy[step].do[key])).toBeInTheDocument();
      }
    }
    const provide = screen.getAllByRole("list", { name: copy.provideLabel });
    const actions = screen.getAllByRole("list", { name: copy.doLabel });
    expect(provide).toHaveLength(TRADE_PROCESS_STEPS.length);
    expect(actions).toHaveLength(TRADE_PROCESS_STEPS.length);
    for (const list of [...provide, ...actions]) {
      expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    }
  });

  it("anchors every detailed step as step-<id>, in order", async () => {
    render(await ProcessTimeline({ variant: "detailed", locale }));

    const items = [...screen.getByRole("list", { name: copy.label }).children];
    expect(items.map((item) => item.id)).toEqual(TRADE_PROCESS_STEPS.map((step) => `step-${step}`));
  });
});

describe("ProcessTimeline", () => {
  it("titles the steps with h3 by default and with h2 on request, never with h1", async () => {
    const { unmount } = render(await ProcessTimeline({ locale: "en" }));
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(8);
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    unmount();

    render(await ProcessTimeline({ locale: "en", headingLevel: 2 }));
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(8);
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
  });

  it("is compact unless asked otherwise", async () => {
    const { container } = render(await ProcessTimeline({ locale: "en" }));
    expect(container.firstElementChild).toHaveAttribute("data-variant", "compact");
  });

  it("joins the compact numerals with connectors, except at the end of each row of four", async () => {
    render(await ProcessTimeline({ variant: "compact", locale: "en" }));

    const items = [...screen.getByRole("list", { name: "Typical Trade Process" }).children];
    const connected = items.map((item) => item.querySelector("span.h-px") !== null);
    expect(connected).toEqual([true, true, true, false, true, true, true, false]);
  });

  it("reads the request locale when no locale is passed", async () => {
    setRequestLocaleForTest("zh");
    render(await ProcessTimeline({}));

    expect(screen.getByRole("list", { name: "典型贸易流程" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "询盘" })).toBeInTheDocument();
  });

  it("keeps Latin numerals in Arabic and puts the rail on the inline start", async () => {
    const { container } = render(await ProcessTimeline({ variant: "detailed", locale: "ar" }));

    expect(screen.getAllByText(/^0[1-8]$/)).toHaveLength(8);
    const item = container.querySelector("li");
    expect(item?.className).toContain("ps-16");
    expect(item?.className).not.toMatch(/\bp[lr]-/);
  });
});
