import "server-only";
import { unstable_cache } from "next/cache";
import { logger } from "@/lib/logger";
import { getDb, isDatabaseConfigured, isDatabaseUnavailableError } from "@/server/db";
import { getEnv } from "@/server/env";
import { PUBLIC_SETTINGS_REVALIDATE_SECONDS, SITE_SETTINGS_TAG } from "./cache";
import { parseSetting, type SettingKey } from "./setting-keys";

/** Public contact details. A channel is present only when a valid value has been configured. */
export interface PublicContactChannels {
  email?: string;
  /** International format, as the company wrote it. */
  phone?: string;
  /** International format, as the company wrote it. */
  whatsapp?: string;
}

type Channel = keyof PublicContactChannels;

const CHANNEL_KEYS = {
  email: "contact.email",
  phone: "contact.phone",
  whatsapp: "contact.whatsapp",
} as const satisfies Record<Channel, SettingKey>;

const CHANNELS = Object.keys(CHANNEL_KEYS) as Channel[];

/**
 * Values from SiteSetting rows. Only rows flagged public are read, and only for the channel keys.
 * Never throws: the header and footer of every page depend on this, so a database that is missing,
 * down or not migrated yet degrades to "environment only" instead of taking the site down.
 */
async function readStoredChannels(): Promise<Partial<Record<Channel, string>>> {
  if (!isDatabaseConfigured()) return {};
  try {
    const rows = await getDb().siteSetting.findMany({
      where: { key: { in: Object.values(CHANNEL_KEYS) }, isPublic: true },
      select: { key: true, value: true },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    return Object.fromEntries(
      CHANNELS.flatMap((channel) => {
        const value = byKey.get(CHANNEL_KEYS[channel]);
        return value === undefined ? [] : [[channel, value]];
      }),
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      logger.warn("settings.public_contact_db_unavailable", { error });
    } else {
      logger.error("settings.public_contact_read_failed", { error });
    }
    return {};
  }
}

function environmentChannels(): Partial<Record<Channel, string | undefined>> {
  const env = getEnv();
  return { email: env.CONTACT_EMAIL, phone: env.CONTACT_PHONE, whatsapp: env.CONTACT_WHATSAPP };
}

/** First valid value wins; an invalid one is dropped rather than shown. */
function firstValid(channel: Channel, candidates: readonly (string | undefined)[]) {
  for (const candidate of candidates) {
    if (candidate === undefined) continue;
    const parsed = parseSetting(CHANNEL_KEYS[channel], candidate);
    if (parsed.ok) return parsed.value;
  }
  return undefined;
}

async function resolvePublicContactChannels(): Promise<PublicContactChannels> {
  const stored = await readStoredChannels();
  const environment = environmentChannels();
  const channels: PublicContactChannels = {};
  for (const channel of CHANNELS) {
    const value = firstValid(channel, [stored[channel], environment[channel]]);
    if (value !== undefined) channels[channel] = value;
  }
  return channels;
}

/**
 * The company's public contact channels, for the footer, the contact page and structured data.
 * Precedence per channel: a valid public SiteSetting row, then a valid CONTACT_* environment
 * variable, then nothing. No channel has ever been supplied, so an empty object is the normal state
 * and callers must render nothing (or a link to the inquiry form) for a missing channel.
 *
 * Cached for 5 minutes and invalidated by updateSettings through the "site-settings" tag.
 */
export const getPublicContactChannels = unstable_cache(
  resolvePublicContactChannels,
  ["public-contact-channels"],
  { revalidate: PUBLIC_SETTINGS_REVALIDATE_SECONDS, tags: [SITE_SETTINGS_TAG] },
);
