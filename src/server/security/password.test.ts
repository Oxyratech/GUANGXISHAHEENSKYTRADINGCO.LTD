// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
  verifyPasswordDummy,
} from "./password";

// scrypt at 64 MiB per hash is slow when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

describe("hashPassword / verifyPassword", () => {
  it("produces a self-describing scrypt hash with a random salt", async () => {
    const [a, b] = await Promise.all([
      hashPassword("correct horse battery"),
      hashPassword("correct horse battery"),
    ]);

    expect(a).toMatch(/^scrypt\$65536\$8\$2\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
    expect(a).not.toContain("correct horse");
    expect(a).not.toBe(b);
  });

  it("verifies the right password and rejects wrong ones", async () => {
    const stored = await hashPassword("correct horse battery");

    await expect(verifyPassword("correct horse battery", stored)).resolves.toBe(true);
    await expect(verifyPassword("correct horse batterY", stored)).resolves.toBe(false);
    await expect(verifyPassword("", stored)).resolves.toBe(false);
  });

  it("treats canonically equivalent Unicode as the same password", async () => {
    const composed = `caf${String.fromCharCode(0xe9)} au lait 2026`.normalize("NFC");
    const decomposed = composed.normalize("NFD");
    expect(decomposed).not.toBe(composed);

    const stored = await hashPassword(composed);
    await expect(verifyPassword(decomposed, stored)).resolves.toBe(true);
  });

  it("honours the parameters embedded in the stored hash", async () => {
    const stored = await hashPassword("correct horse battery");
    const weakened = stored.replace("$65536$8$2$", "$16384$8$1$");
    // Different parameters derive a different key, so a tampered header must not verify.
    await expect(verifyPassword("correct horse battery", weakened)).resolves.toBe(false);
  });

  it("never verifies malformed or out-of-bounds hashes", async () => {
    await expect(verifyPassword("anything at all", "")).resolves.toBe(false);
    await expect(verifyPassword("anything at all", "plaintext")).resolves.toBe(false);
    await expect(verifyPassword("anything at all", "scrypt$65536$8$2$abc")).resolves.toBe(false);
    await expect(
      verifyPassword("anything at all", "bcrypt$65536$8$2$AAAAAAAAAAAAAAAAAAAAAA$AAAA"),
    ).resolves.toBe(false);
    // N = 2^30 must be refused rather than allocating gigabytes.
    await expect(
      verifyPassword(
        "anything at all",
        `scrypt$${2 ** 30}$8$2$AAAAAAAAAAAAAAAAAAAAAA$${"A".repeat(43)}`,
      ),
    ).resolves.toBe(false);
  });

  it("does not verify absurdly long input", async () => {
    const stored = await hashPassword("correct horse battery");
    await expect(verifyPassword("x".repeat(5000), stored)).resolves.toBe(false);
  });

  it("verifyPasswordDummy always resolves false", async () => {
    await expect(verifyPasswordDummy()).resolves.toBe(false);
  });
});

describe("validatePasswordStrength", () => {
  it.each([
    "Correct-horse-9-battery",
    "a passphrase with spaces",
    "Tr0ub4dor&3xylophone",
    "n7Vq!pL2#zWm",
  ])("accepts %j", (password) => {
    expect(validatePasswordStrength(password)).toEqual({ ok: true });
  });

  it("enforces 12 to 128 characters", () => {
    const varied = (length: number) =>
      Array.from({ length }, (_, i) => "aB3$eF7&hJ1(kL5)nP9+"[i % 20]).join("");

    expect(validatePasswordStrength(varied(11))).toMatchObject({
      ok: false,
      reason: expect.stringContaining("12"),
    });
    expect(validatePasswordStrength(varied(129))).toMatchObject({
      ok: false,
      reason: expect.stringContaining("128"),
    });
    expect(validatePasswordStrength(varied(12))).toEqual({ ok: true });
    expect(validatePasswordStrength(varied(128))).toEqual({ ok: true });
  });

  it("counts characters, not UTF-16 units", () => {
    // 11 letters + 1 emoji is 12 characters (13 UTF-16 units); 6 letters + 3 emoji is only 9 characters.
    expect(validatePasswordStrength("abcdefghijk\u{1F600}")).toEqual({ ok: true });
    expect(validatePasswordStrength("abcdef\u{1F600}\u{1F600}\u{1F600}")).toMatchObject({
      ok: false,
    });
  });

  it("rejects a single character class", () => {
    expect(validatePasswordStrength("abcdefghijklmnop")).toMatchObject({ ok: false });
    expect(validatePasswordStrength("839201746501234")).toMatchObject({ ok: false });
    expect(validatePasswordStrength("QWXZVBNMKJHGFDS")).toMatchObject({ ok: false });
  });

  it("rejects common passwords and obvious variants", () => {
    expect(validatePasswordStrength("Password1234!")).toMatchObject({ ok: false });
    expect(validatePasswordStrength("MyPassword-2026x")).toMatchObject({ ok: false });
    expect(validatePasswordStrength("qwertyuiop-12")).toMatchObject({ ok: false });
    expect(validatePasswordStrength("1234567890-ab")).toMatchObject({ ok: false });
  });

  it("rejects highly repetitive passwords", () => {
    expect(validatePasswordStrength("aabbaabbaabb1")).toMatchObject({
      ok: false,
      reason: expect.stringContaining("repetitive"),
    });
  });

  it("rejects passwords containing the email local part", () => {
    expect(
      validatePasswordStrength("Rohan.Aligondal-2026!", "rohan.aligondal@example.com"),
    ).toMatchObject({
      ok: false,
      reason: expect.stringContaining("email"),
    });
    expect(validatePasswordStrength("Tr0ub4dor&3xylophone", "rohan.aligondal@example.com")).toEqual(
      { ok: true },
    );
  });

  it("ignores very short email local parts", () => {
    expect(validatePasswordStrength("xyz-Different-Words-1", "xy@example.com")).toEqual({
      ok: true,
    });
  });
});
