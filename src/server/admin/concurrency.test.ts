import { describe, expect, it, vi } from "vitest";
import { CONFLICT_MESSAGE, ConflictError, updateWithVersion } from "./concurrency";

function delegate(count: number) {
  return { updateMany: vi.fn().mockResolvedValue({ count }) };
}

describe("updateWithVersion", () => {
  it("updates only the row at the expected version and increments it", async () => {
    const product = delegate(1);

    await updateWithVersion(product, { id: "p1", version: 4 }, { status: "PUBLISHED" } as never);

    expect(product.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", version: 4 },
      data: { status: "PUBLISHED", version: { increment: 1 } },
    });
  });

  it("throws ConflictError when no row matched", async () => {
    const product = delegate(0);

    await expect(
      updateWithVersion(product, { id: "p1", version: 4 }, { featured: true } as never),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("does not let the caller override the version bump", async () => {
    const product = delegate(1);

    await updateWithVersion(product, { id: "p1", version: 1 }, {
      version: 99,
      origin: "CN",
    } as never);

    expect(product.updateMany.mock.calls[0][0].data.version).toEqual({ increment: 1 });
  });

  it("lets database errors through untouched", async () => {
    const product = { updateMany: vi.fn().mockRejectedValue(new Error("connection reset")) };

    await expect(updateWithVersion(product, { id: "p1", version: 1 }, {} as never)).rejects.toThrow(
      "connection reset",
    );
  });
});

describe("ConflictError", () => {
  it("carries the message the forms show", () => {
    expect(new ConflictError().message).toBe(CONFLICT_MESSAGE);
    expect(CONFLICT_MESSAGE).toBe("This record was changed by someone else. Reload and try again.");
    expect(new ConflictError().name).toBe("ConflictError");
  });
});
