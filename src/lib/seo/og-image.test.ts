import { existsSync } from "node:fs";
import { join } from "node:path";
import { fillMetadataSegment } from "next/dist/lib/metadata/get-metadata-route";
import { LOCALES } from "@/i18n/locales";
import { ogImagePath, ogImageUrl } from "./og-image";

const OG_ROUTE_FILE = "src/app/(site)/[locale]/opengraph-image.tsx";

describe("ogImagePath", () => {
  it.each(LOCALES)("names the route Next serves for %s", (locale) => {
    // A page's openGraph replaces the layout-level image, so the URL is spelled out by
    // buildMetadata. This is the URL Next itself derives for the file convention.
    expect(ogImagePath(locale)).toBe(
      fillMetadataSegment("/(site)/[locale]", { locale }, "opengraph-image", false),
    );
  });

  it("points at a file that exists", () => {
    expect(existsSync(join(process.cwd(), OG_ROUTE_FILE))).toBe(true);
  });

  it("is absolute on the configured origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.example.test");
    expect(ogImageUrl("zh")).toMatch(
      /^https:\/\/www\.example\.test\/zh\/opengraph-image-[0-9a-z]{1,6}$/,
    );
    vi.unstubAllEnvs();
  });
});
