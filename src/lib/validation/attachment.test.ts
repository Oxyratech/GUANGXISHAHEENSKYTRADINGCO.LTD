import { describe, expect, it } from "vitest";
import {
  acceptedExtensions,
  checkAttachment,
  displayExtension,
  isFileLike,
  toMegabytes,
  type UploadRules,
} from "./attachment";

const rules: UploadRules = {
  maxBytes: 5 * 1024 * 1024,
  extensions: ["pdf", "jpg", "png", "webp", "docx", "xlsx"],
};

describe("checkAttachment", () => {
  it.each(["quote.pdf", "photo.JPG", "photo.jpeg", "scan.png", "a.webp", "list.docx", "t.xlsx"])(
    "accepts %s",
    (name) => {
      expect(checkAttachment({ name, size: 1000 }, rules)).toBeNull();
    },
  );

  it("accepts a file of exactly the maximum size and rejects one byte more", () => {
    expect(checkAttachment({ name: "a.pdf", size: rules.maxBytes }, rules)).toBeNull();
    expect(checkAttachment({ name: "a.pdf", size: rules.maxBytes + 1 }, rules)).toBe(
      "validation.fileTooLarge?max=5",
    );
  });

  it("rejects an empty file", () => {
    expect(checkAttachment({ name: "a.pdf", size: 0 }, rules)).toBe("errors.upload.empty");
  });

  it.each(["virus.exe", "page.html", "image.svg", "old.doc", "archive.zip", "noextension", ".pdf"])(
    "rejects %s by its type",
    (name) => {
      expect(checkAttachment({ name, size: 1000 }, rules)).toBe("validation.fileType");
    },
  );
});

describe("helpers", () => {
  it("adds the .jpeg spelling when jpg is accepted", () => {
    expect(acceptedExtensions(rules)).toContain("jpeg");
    expect(acceptedExtensions({ maxBytes: 1, extensions: ["pdf"] })).toEqual(["pdf"]);
  });

  it("rounds megabytes to one decimal", () => {
    expect(toMegabytes(5 * 1024 * 1024)).toBe(5);
    expect(toMegabytes(2.5 * 1024 * 1024)).toBe(2.5);
    expect(toMegabytes(1024)).toBe(0);
  });

  it("writes extensions the way they are spelled", () => {
    expect(["pdf", "jpg", "webp", "docx"].map(displayExtension)).toEqual([
      "PDF",
      "JPG",
      "WebP",
      "DOCX",
    ]);
  });

  it("recognizes anything with a name and a size as a file", () => {
    expect(isFileLike({ name: "a.pdf", size: 1 })).toBe(true);
    expect(isFileLike(null)).toBe(false);
    expect(isFileLike("a.pdf")).toBe(false);
    expect(isFileLike({ name: "a.pdf" })).toBe(false);
  });
});
