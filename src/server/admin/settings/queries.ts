import "server-only";
import { getEnv } from "@/server/env";
import { getSettings, SETTING_KEYS, type SettingKey } from "@/server/settings";

/*
 * What the Settings screen shows: for each known key, the admin-stored value (if any), the
 * environment fallback (if any) and which one is effective, so an operator understands precedence
 * without reading code. Only channels this file knows an environment variable for get a fallback;
 * everything else still shows the admin value and "not set" honestly.
 */

export type SettingSource = "admin" | "environment" | "none";

export interface SettingOverview {
  key: SettingKey;
  label: string;
  description: string;
  adminValue?: string;
  environmentValue?: string;
  effectiveValue?: string;
  source: SettingSource;
}

const LABELS: Record<SettingKey, { label: string; description: string }> = {
  "contact.email": {
    label: "Contact email",
    description: "Shown in the footer, the contact page and structured data once set.",
  },
  "contact.phone": {
    label: "Contact phone",
    description: "International format (e.g. +86 771 1234567). Shown publicly once set.",
  },
  "contact.whatsapp": {
    label: "Contact WhatsApp",
    description: "International format. Used to build a WhatsApp chat link once set.",
  },
};

/** The environment variable each key falls back to, where one exists. */
function environmentValue(key: SettingKey): string | undefined {
  const env = getEnv();
  switch (key) {
    case "contact.email":
      return env.CONTACT_EMAIL;
    case "contact.phone":
      return env.CONTACT_PHONE;
    case "contact.whatsapp":
      return env.CONTACT_WHATSAPP;
    default:
      return undefined;
  }
}

/** @throws DatabaseUnavailableError when the database cannot be reached. */
export async function loadSettingsOverview(): Promise<SettingOverview[]> {
  const keys = Object.keys(SETTING_KEYS) as SettingKey[];
  const stored = await getSettings(keys);

  return keys.map((key) => {
    const adminValue = stored[key];
    const environment = environmentValue(key);
    const effectiveValue = adminValue ?? environment;
    const source: SettingSource =
      adminValue !== undefined ? "admin" : environment ? "environment" : "none";
    const meta = LABELS[key] ?? { label: key, description: "" };
    return {
      key,
      label: meta.label,
      description: meta.description,
      adminValue,
      environmentValue: environment,
      effectiveValue,
      source,
    };
  });
}
