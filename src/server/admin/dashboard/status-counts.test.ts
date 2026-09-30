import { describe, expect, it } from "vitest";
import { countFor, mergeStatusCounts, totalOf } from "./status-counts";

const VOCABULARY = ["DRAFT", "PUBLISHED", "ARCHIVED"];

describe("mergeStatusCounts", () => {
  it("lists every status of the vocabulary in order, with real zeros", () => {
    expect(mergeStatusCounts([{ status: "PUBLISHED", count: 3 }], VOCABULARY)).toEqual([
      { status: "DRAFT", count: 0 },
      { status: "PUBLISHED", count: 3 },
      { status: "ARCHIVED", count: 0 },
    ]);
  });

  it("is all zeros when there are no rows", () => {
    const merged = mergeStatusCounts([], VOCABULARY);

    expect(merged.map((entry) => entry.count)).toEqual([0, 0, 0]);
    expect(totalOf(merged)).toBe(0);
  });

  it("keeps a status the vocabulary does not know, after the known ones, so totals stay honest", () => {
    const merged = mergeStatusCounts(
      [
        { status: "DRAFT", count: 1 },
        { status: "LEGACY", count: 4 },
      ],
      VOCABULARY,
    );

    expect(merged.at(-1)).toEqual({ status: "LEGACY", count: 4 });
    expect(totalOf(merged)).toBe(5);
  });

  it("adds up repeated rows for one status", () => {
    const merged = mergeStatusCounts(
      [
        { status: "DRAFT", count: 1 },
        { status: "DRAFT", count: 2 },
      ],
      VOCABULARY,
    );

    expect(countFor(merged, "DRAFT")).toBe(3);
  });
});

describe("countFor", () => {
  it("is zero for a status that is not present", () => {
    expect(countFor([{ status: "NEW", count: 2 }], "DONE")).toBe(0);
    expect(countFor([{ status: "NEW", count: 2 }], "NEW")).toBe(2);
  });
});
