import { findMediaAssetIds, mediaAssetIdFromPath, mediaPath } from "./media-path";

const A = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const B = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

describe("mediaAssetIdFromPath", () => {
  it("reads the id of a /media path, lower-cased", () => {
    expect(mediaAssetIdFromPath(`/media/${A}`)).toBe(A);
    expect(mediaAssetIdFromPath(`/media/${A.toUpperCase()}`)).toBe(A);
  });

  it.each([
    "/media/not-a-guid",
    `/media/${A}/x`,
    `/media/${A}?download=1`,
    `/media/${A}#x`,
    `//media/${A}`,
    `media/${A}`,
    `https://example.com/media/${A}`,
    `/files/${A}`,
    "",
  ])("rejects %s", (path) => {
    expect(mediaAssetIdFromPath(path)).toBeNull();
  });
});

describe("mediaPath", () => {
  it("is the canonical lower-case address", () => {
    expect(mediaPath(A.toUpperCase())).toBe(`/media/${A}`);
  });
});

describe("findMediaAssetIds", () => {
  it("lists each distinct id once, in order of appearance, lower-cased", () => {
    const markdown = `![a](/media/${A}) text [b](/media/${B.toUpperCase()}) ![again](/media/${A})`;

    expect(findMediaAssetIds(markdown)).toEqual([A, B]);
  });

  it("finds nothing in a body without media", () => {
    expect(findMediaAssetIds("![x](https://example.com/a.png) and /media/nope")).toEqual([]);
  });

  it("does not take a longer hex run for an id", () => {
    expect(findMediaAssetIds(`/media/${A}0`)).toEqual([]);
  });

  it("stops at 50 ids", () => {
    const ids = Array.from(
      { length: 80 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );

    expect(findMediaAssetIds(ids.map((id) => `/media/${id}`).join(" "))).toHaveLength(50);
  });
});
