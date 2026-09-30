import { describe, expect, it } from "vitest";
import { buildContactReplyMailto } from "./contact-links";

describe("buildContactReplyMailto", () => {
  it("URL-encodes the address and the reference code in the subject", () => {
    expect(buildContactReplyMailto("jane@example.com", "CTM-1A2B3C")).toBe(
      "mailto:jane%40example.com?subject=Re%3A%20your%20message%20CTM-1A2B3C",
    );
  });
});
