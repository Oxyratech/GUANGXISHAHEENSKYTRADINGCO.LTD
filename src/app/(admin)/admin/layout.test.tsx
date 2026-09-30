import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/fonts", () => ({ plexSans: { variable: "font-plex-sans-variable" } }));

import AdminRootLayout, { metadata, viewport } from "./layout";

describe("AdminRootLayout", () => {
  const html = renderToStaticMarkup(
    <AdminRootLayout>
      <p>page body</p>
    </AdminRootLayout>,
  );

  it("is its own English, left-to-right document", () => {
    expect(html).toMatch(/^<html [^>]*lang="en"/);
    expect(html).toMatch(/dir="ltr"/);
  });

  it("uses the shared font and design tokens, and renders the page", () => {
    expect(html).toContain("font-plex-sans-variable");
    expect(html).toContain("bg-surface");
    expect(html).toContain("<p>page body</p>");
  });

  it("carries no public header or footer", () => {
    expect(html).not.toMatch(/<footer/);
    expect(html).not.toMatch(/Skip to content/i);
  });

  it("loads no analytics", () => {
    expect(html).not.toMatch(/plausible/i);
    expect(html).not.toMatch(/<script[^>]+src=/);
  });

  it("mounts the toast region so forms can confirm what they did", () => {
    expect(html).toMatch(/aria-label="Notifications"/);
  });

  it("is never indexed", () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("titles pages '<page> | Shaheen Sky Admin'", () => {
    expect(metadata.title).toEqual({
      default: "Shaheen Sky Admin",
      template: "%s | Shaheen Sky Admin",
    });
  });

  it("scales to the device and colours the browser chrome navy", () => {
    expect(viewport).toMatchObject({
      width: "device-width",
      initialScale: 1,
      themeColor: "#0b1f3a",
    });
  });
});
