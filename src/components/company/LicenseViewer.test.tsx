import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LICENSE_IMAGE } from "@/config/company";
import { trackEvent } from "@/lib/analytics/track";
import arCompanyInfo from "@/messages/ar/companyInfo.json";
import enCompanyInfo from "@/messages/en/companyInfo.json";
import { LicenseViewer } from "./LicenseViewer";
import { renderWithCompanyIntl } from "./test-utils";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);
vi.mock("@/lib/analytics/track", () => ({ trackEvent: vi.fn() }));

const en = enCompanyInfo.license.viewer;
const ar = arCompanyInfo.license.viewer;

function renderViewer(locale: "en" | "ar" = "en") {
  return renderWithCompanyIntl(
    <LicenseViewer image={LICENSE_IMAGE} caption={<span>Copy of the license</span>} />,
    locale,
  );
}

const trigger = () => screen.getByRole("button", { name: en.viewFullSize });
const dialog = () => screen.getByRole("dialog", { name: en.dialogTitle });
const fullSizeImage = () => within(dialog()).getByRole("img");
const zoomStatus = () => within(dialog()).getByRole("status");

beforeEach(() => vi.mocked(trackEvent).mockClear());

describe("LicenseViewer preview", () => {
  it("shows the license with a description of the document, not a transcription of it", () => {
    renderViewer();

    const preview = screen.getByRole("img", { name: en.previewAlt });
    expect(preview.getAttribute("src")).toContain(encodeURIComponent(LICENSE_IMAGE.src));
    expect(preview).toHaveAttribute("width", String(LICENSE_IMAGE.width));
    expect(preview).toHaveAttribute("height", String(LICENSE_IMAGE.height));
    expect(preview.getAttribute("sizes")).toBeTruthy();
    expect(en.previewAlt).not.toContain("91450100MAKG57TE3Y");
    expect(en.previewAlt).not.toContain("伍万");
  });

  it("offers the original file in a new tab, safely", () => {
    renderViewer();

    const link = screen.getByRole("link", { name: /Open original file/ });
    expect(link).toHaveAttribute("href", LICENSE_IMAGE.src);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
    expect(link).toHaveTextContent(en.opensInNewTab);
  });

  it("renders the caption it is given inside the figure", () => {
    renderViewer();
    expect(screen.getByRole("figure")).toHaveTextContent("Copy of the license");
  });
});

describe("LicenseViewer dialog", () => {
  it("opens from the keyboard as a named, described dialog and reports the view once", async () => {
    const user = userEvent.setup();
    renderViewer();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.tab();
    expect(trigger()).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(dialog()).toHaveAccessibleDescription(en.dialogDescription);
    expect(dialog()).toContainElement(document.activeElement as HTMLElement);
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith("document_viewed", {
      document: "business-license",
      locale: "en",
    });
  });

  it("closes with Escape and gives focus back to the button that opened it", async () => {
    const user = userEvent.setup();
    renderViewer();
    await user.click(trigger());
    expect(dialog()).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("closes with its labelled close button", async () => {
    const user = userEvent.setup();
    renderViewer();
    await user.click(trigger());

    await user.click(within(dialog()).getByRole("button", { name: en.close }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("serves the original file unchanged in the full-size view", async () => {
    const user = userEvent.setup();
    renderViewer();
    await user.click(trigger());

    expect(fullSizeImage()).toHaveAttribute("src", LICENSE_IMAGE.src);
    expect(within(dialog()).getByRole("link", { name: /Open original file/ })).toHaveAttribute(
      "href",
      LICENSE_IMAGE.src,
    );
  });

  it("puts the scrollable picture in the tab order, named, so it can be panned with the keys", async () => {
    const user = userEvent.setup();
    renderViewer();
    await user.click(trigger());

    const region = within(dialog()).getByRole("region", { name: en.scrollRegion });
    expect(region).toHaveAttribute("tabindex", "0");
    region.focus();
    expect(region).toHaveFocus();
  });
});

describe("LicenseViewer zoom", () => {
  const scaleOf = () =>
    Math.round(Number.parseFloat(fullSizeImage().style.getPropertyValue("--zoom")) * 100);

  async function openViewer() {
    const user = userEvent.setup();
    renderViewer();
    await user.click(trigger());
    return user;
  }

  it("starts at 100%, the whole document fitted to its area", async () => {
    await openViewer();

    expect(scaleOf()).toBe(100);
    expect(zoomStatus()).toHaveTextContent("Zoom: 100%");
  });

  it("zooms in and out in steps and announces the level", async () => {
    const user = await openViewer();

    await user.click(within(dialog()).getByRole("button", { name: en.zoomIn }));
    expect(scaleOf()).toBe(125);
    expect(zoomStatus()).toHaveTextContent("Zoom: 125%");

    await user.click(within(dialog()).getByRole("button", { name: en.zoomIn }));
    expect(scaleOf()).toBe(150);

    await user.click(within(dialog()).getByRole("button", { name: en.zoomOut }));
    expect(scaleOf()).toBe(125);
  });

  it("resets to 100%", async () => {
    const user = await openViewer();
    await user.click(within(dialog()).getByRole("button", { name: en.zoomIn }));
    await user.click(within(dialog()).getByRole("button", { name: en.zoomIn }));
    expect(scaleOf()).toBeGreaterThan(100);

    await user.click(within(dialog()).getByRole("button", { name: en.zoomReset }));

    expect(scaleOf()).toBe(100);
    expect(zoomStatus()).toHaveTextContent("Zoom: 100%");
  });

  it("marks the ends of the range without dropping keyboard focus", async () => {
    const user = await openViewer();
    const zoomOut = within(dialog()).getByRole("button", { name: en.zoomOut });
    const zoomIn = within(dialog()).getByRole("button", { name: en.zoomIn });
    const reset = within(dialog()).getByRole("button", { name: en.zoomReset });
    expect(zoomOut).toHaveAttribute("aria-disabled", "true");
    expect(reset).toHaveAttribute("aria-disabled", "true");

    await user.click(zoomOut);
    expect(scaleOf()).toBe(100);

    zoomIn.focus();
    for (let press = 0; press < 8; press += 1) await user.keyboard("{Enter}");

    expect(scaleOf()).toBe(300);
    expect(zoomIn).toHaveAttribute("aria-disabled", "true");
    expect(zoomIn).toHaveFocus();
    expect(zoomOut).not.toHaveAttribute("aria-disabled");
  });

  it("opens at 100% again after being closed while zoomed", async () => {
    const user = await openViewer();
    await user.click(within(dialog()).getByRole("button", { name: en.zoomIn }));
    await user.keyboard("{Escape}");

    await user.click(trigger());

    expect(scaleOf()).toBe(100);
  });

  it("scales the picture only: same file, same proportions", async () => {
    const user = await openViewer();
    await user.click(within(dialog()).getByRole("button", { name: en.zoomIn }));

    const image = fullSizeImage();
    expect(image).toHaveAttribute("src", LICENSE_IMAGE.src);
    expect(image).toHaveAttribute("width", String(LICENSE_IMAGE.width));
    expect(image).toHaveAttribute("height", String(LICENSE_IMAGE.height));
    expect(image.style.height).toBe("");
  });
});

describe("LicenseViewer in Arabic", () => {
  it("uses the Arabic copy and keeps the picture panning left to right", async () => {
    const user = userEvent.setup();
    renderViewer("ar");

    await user.click(screen.getByRole("button", { name: ar.viewFullSize }));

    const region = screen.getByRole("region", { name: ar.scrollRegion });
    expect(region).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("dialog", { name: ar.dialogTitle })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("التكبير: 100%");
    expect(trackEvent).toHaveBeenCalledWith("document_viewed", {
      document: "business-license",
      locale: "ar",
    });
  });
});
