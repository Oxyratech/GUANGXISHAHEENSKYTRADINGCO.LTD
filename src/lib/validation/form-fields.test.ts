// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/security/rate-limit", () => ({
  RATE_LIMITS: {},
  rateLimit: vi.fn(),
  rateLimitKey: vi.fn(),
}));

import { FORM_TOKEN_FIELD, HONEYPOT_FIELD } from "@/server/security/anti-spam";
import { FORM_TOKEN_FIELD_NAME, HONEYPOT_FIELD_NAME } from "./form-fields";

describe("form field names", () => {
  it("match the ones the server's anti-spam guard reads", () => {
    expect(HONEYPOT_FIELD_NAME).toBe(HONEYPOT_FIELD);
    expect(FORM_TOKEN_FIELD_NAME).toBe(FORM_TOKEN_FIELD);
  });
});
