// @vitest-environment node
import AppleIcon, { contentType as appleContentType, size as appleSize } from "@/app/apple-icon";
import OpenGraphImage, {
  alt as ogAlt,
  contentType as ogContentType,
  dynamicParams as ogDynamicParams,
  generateStaticParams as ogStaticParams,
  size as ogSize,
} from "@/app/(site)/[locale]/opengraph-image";
import { LOCALES } from "@/i18n/locales";
import { DEFAULT_OG_IMAGE_ALT, OG_IMAGE_SIZE } from "./constants";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Width and height from the IHDR chunk, after checking the PNG signature. */
async function readPng(response: Response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    signature: [...bytes.slice(0, 8)],
    width: view.getUint32(16),
    height: view.getUint32(20),
    byteLength: bytes.byteLength,
  };
}

describe("opengraph-image", () => {
  it("advertises exactly what buildMetadata puts in the page metadata", () => {
    expect(ogAlt).toBe(DEFAULT_OG_IMAGE_ALT);
    expect(ogSize).toEqual(OG_IMAGE_SIZE);
    expect(ogContentType).toBe("image/png");
  });

  it("is generated once per locale at build time, and only for those locales", () => {
    expect(ogStaticParams()).toEqual(LOCALES.map((locale) => ({ locale })));
    expect(ogDynamicParams).toBe(false);
  });

  it("renders a 1200x630 PNG with the bundled Latin font only", async () => {
    const response = OpenGraphImage();
    expect(response.headers.get("content-type")).toBe("image/png");
    const png = await readPng(response);
    expect(png.signature).toEqual(PNG_SIGNATURE);
    expect([png.width, png.height]).toEqual([1200, 630]);
    // A plain navy card with vector art and Latin text compresses well below the 8 MB Open Graph limit.
    expect(png.byteLength).toBeLessThan(200_000);
  });
});

describe("apple-icon", () => {
  it("is a 180x180 PNG", async () => {
    expect(appleSize).toEqual({ width: 180, height: 180 });
    expect(appleContentType).toBe("image/png");
    const png = await readPng(AppleIcon());
    expect(png.signature).toEqual(PNG_SIGNATURE);
    expect([png.width, png.height]).toEqual([180, 180]);
  });
});
