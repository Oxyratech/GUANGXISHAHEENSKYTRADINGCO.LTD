// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as SettingsModule from "@/server/settings";

const mocks = vi.hoisted(() => ({ getSettings: vi.fn(), getEnv: vi.fn() }));

vi.mock("@/server/settings", async () => {
  const actual = await vi.importActual<typeof SettingsModule>("@/server/settings");
  return { ...actual, getSettings: mocks.getSettings };
});
vi.mock("@/server/env", () => ({ getEnv: mocks.getEnv }));

import { loadSettingsOverview } from "./queries";

const NO_ENV = {
  DATABASE_URL: undefined,
  AUTH_SECRET: undefined,
  SMTP_HOST: undefined,
  SMTP_PORT: 587,
  SMTP_USER: undefined,
  SMTP_PASSWORD: undefined,
  SMTP_FROM: undefined,
  INQUIRY_NOTIFY_EMAIL: undefined,
  UPLOAD_MAX_BYTES: 0,
  CONTACT_EMAIL: undefined,
  CONTACT_PHONE: undefined,
  CONTACT_WHATSAPP: undefined,
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: undefined,
  SEED_ADMIN_EMAIL: undefined,
  SEED_ADMIN_PASSWORD: undefined,
};

beforeEach(() => {
  mocks.getSettings.mockReset().mockResolvedValue({});
  mocks.getEnv.mockReset().mockReturnValue(NO_ENV);
});

describe("loadSettingsOverview", () => {
  it("reports 'none' when neither an admin value nor an environment fallback exists", async () => {
    const overview = await loadSettingsOverview();
    const email = overview.find((setting) => setting.key === "contact.email");

    expect(email).toMatchObject({ source: "none", effectiveValue: undefined });
  });

  it("falls back to the environment value when no admin setting is stored", async () => {
    mocks.getEnv.mockReturnValue({ ...NO_ENV, CONTACT_EMAIL: "env@example.com" });

    const overview = await loadSettingsOverview();
    const email = overview.find((setting) => setting.key === "contact.email");

    expect(email).toMatchObject({
      source: "environment",
      environmentValue: "env@example.com",
      effectiveValue: "env@example.com",
    });
  });

  it("prefers the admin-stored value over the environment fallback", async () => {
    mocks.getSettings.mockResolvedValue({ "contact.email": "admin@example.com" });
    mocks.getEnv.mockReturnValue({ ...NO_ENV, CONTACT_EMAIL: "env@example.com" });

    const overview = await loadSettingsOverview();
    const email = overview.find((setting) => setting.key === "contact.email");

    expect(email).toMatchObject({
      source: "admin",
      adminValue: "admin@example.com",
      environmentValue: "env@example.com",
      effectiveValue: "admin@example.com",
    });
  });

  it("covers every known setting key", async () => {
    const overview = await loadSettingsOverview();
    expect(overview.map((setting) => setting.key).sort()).toEqual([
      "contact.email",
      "contact.phone",
      "contact.whatsapp",
    ]);
  });
});
