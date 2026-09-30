import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DirectionProvider } from "@/components/ui/direction";
import { ProductGallery } from "./ProductGallery";
import { makeImage, renderServer } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);

const IMAGES = [
  makeImage(1, "Bolt from above"),
  makeImage(2, "Bolt from the side"),
  makeImage(3, "Bolt in its box"),
];

/** The large image: the one that is not a thumbnail (thumbnails have an empty alt). */
const mainImage = () => screen.getByRole("tabpanel").querySelector("img");

describe("ProductGallery without images", () => {
  it("shows the labelled vector placeholder, never a photo", async () => {
    const { container } = await renderServer(
      <ProductGallery images={[]} name="Steel bolt" locale="en" />,
    );

    expect(
      screen.getByRole("img", { name: "No photo of Steel bolt has been published." }),
    ).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("labels the placeholder in the page language", async () => {
    await renderServer(<ProductGallery images={[]} name="钢制螺栓" locale="zh" />);
    expect(screen.getByRole("img", { name: "尚未发布钢制螺栓的照片。" })).toBeInTheDocument();
  });
});

describe("ProductGallery with one image", () => {
  it("renders a plain image with its own alt text and no controls", async () => {
    await renderServer(<ProductGallery images={[IMAGES[0]!]} name="Steel bolt" locale="en" />);

    expect(screen.getByRole("img", { name: "Bolt from above" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("ProductGallery with several images", () => {
  it("shows the first (primary) image and one thumbnail per image, named with position and alt text", async () => {
    await renderServer(<ProductGallery images={IMAGES} name="Steel bolt" locale="en" />);

    const tablist = screen.getByRole("tablist", { name: "Choose an image" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual([
      "Image 1 of 3: Bolt from above",
      "Image 2 of 3: Bolt from the side",
      "Image 3 of 3: Bolt in its box",
    ]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(mainImage()).toHaveAttribute("alt", "Bolt from above");
  });

  it("keeps decorative thumbnails out of the accessibility tree", async () => {
    await renderServer(<ProductGallery images={IMAGES} name="Steel bolt" locale="en" />);
    const thumbnails = within(screen.getByRole("tablist")).getAllByRole("presentation", {
      hidden: true,
    });
    expect(thumbnails.length).toBe(3);
  });

  it("selects an image with the mouse", async () => {
    const user = userEvent.setup();
    await renderServer(<ProductGallery images={IMAGES} name="Steel bolt" locale="en" />);

    await user.click(screen.getByRole("tab", { name: /Image 2 of 3/ }));

    expect(mainImage()).toHaveAttribute("alt", "Bolt from the side");
    expect(screen.getByRole("tab", { name: /Image 2 of 3/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("is operable from the keyboard: Tab enters the row, arrows, Home and End move between images", async () => {
    const user = userEvent.setup();
    await renderServer(<ProductGallery images={IMAGES} name="Steel bolt" locale="en" />);

    await user.tab();
    expect(screen.getByRole("tab", { name: /Image 1 of 3/ })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /Image 2 of 3/ })).toHaveFocus();
    expect(mainImage()).toHaveAttribute("alt", "Bolt from the side");

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: /Image 3 of 3/ })).toHaveFocus();
    expect(mainImage()).toHaveAttribute("alt", "Bolt in its box");

    await user.keyboard("{Home}");
    expect(mainImage()).toHaveAttribute("alt", "Bolt from above");

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: /Image 3 of 3/ })).toHaveFocus();
  });

  it("is a single tab stop: Tab leaves the row instead of visiting every thumbnail", async () => {
    const user = userEvent.setup();
    await renderServer(
      <>
        <ProductGallery images={IMAGES} name="Steel bolt" locale="en" />
        <button type="button">After</button>
      </>,
    );

    await user.tab();
    await user.tab();

    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("mirrors the arrow keys in a right-to-left page", async () => {
    const user = userEvent.setup();
    await renderServer(
      <DirectionProvider dir="rtl">
        <ProductGallery images={IMAGES} name="ملف" locale="ar" />
      </DirectionProvider>,
    );

    await user.tab();
    await user.keyboard("{ArrowLeft}");

    expect(mainImage()).toHaveAttribute("alt", "Bolt from the side");
  });

  it("names the thumbnails in the page language", async () => {
    await renderServer(<ProductGallery images={IMAGES} name="钢制螺栓" locale="zh" />);
    expect(screen.getByRole("tablist", { name: "选择图片" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "第 1 张，共 3 张：Bolt from above" }),
    ).toBeInTheDocument();
  });
});
