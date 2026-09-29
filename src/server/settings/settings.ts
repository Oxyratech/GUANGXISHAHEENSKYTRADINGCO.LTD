import "server-only";
import { revalidateTag } from "next/cache";
import { writeAudit } from "@/server/audit";
import { getDb, toDatabaseError } from "@/server/db";
import { SITE_SETTINGS_TAG } from "./cache";
import { isSettingKey, parseSetting, SETTING_KEYS, type SettingKey } from "./setting-keys";

export interface SettingsActor {
  readonly id: string;
  readonly email: string;
}

/** An omitted key is left alone; `null` or a blank string clears the setting. */
export type SettingsUpdate = Partial<Record<SettingKey, string | null>>;

/** `errors` holds one code per rejected key: invalid_email, invalid_phone, invalid_whatsapp or unknown_setting. */
export type UpdateSettingsResult =
  | { ok: true; updated: SettingKey[]; cleared: SettingKey[] }
  | { ok: false; errors: Record<string, string> };

/**
 * Stored values for the admin form, valid ones only. Unlike the public readers it does not filter
 * on isPublic and does not fall back to the environment: the admin sees exactly what is stored.
 *
 * @throws DatabaseUnavailableError when the database cannot be reached.
 */
export async function getSettings(
  keys: readonly SettingKey[],
): Promise<Partial<Record<SettingKey, string>>> {
  if (keys.length === 0) return {};
  try {
    const rows = await getDb().siteSetting.findMany({
      where: { key: { in: [...keys] } },
      select: { key: true, value: true },
    });
    const values: Partial<Record<SettingKey, string>> = {};
    for (const row of rows) {
      if (!isSettingKey(row.key)) continue;
      const parsed = parseSetting(row.key, row.value);
      if (parsed.ok) values[row.key] = parsed.value;
    }
    return values;
  } catch (error) {
    throw toDatabaseError(error);
  }
}

function isBlank(value: unknown): boolean {
  return value === null || (typeof value === "string" && value.trim() === "");
}

/**
 * Validates and saves site settings for the admin. Nothing is written unless every submitted value
 * is valid. A null or blank value clears the setting (the environment default applies again).
 * Afterwards the "site-settings" cache tag is expired so public pages pick the change up at once,
 * and one audit entry names the keys touched (never the values).
 *
 * The caller must already have checked the `settings:write` permission.
 *
 * @throws DatabaseUnavailableError when the database cannot be reached.
 */
export async function updateSettings(
  actor: SettingsActor,
  values: SettingsUpdate,
): Promise<UpdateSettingsResult> {
  const errors: Record<string, string> = {};
  const toSave: [SettingKey, string][] = [];
  const cleared: SettingKey[] = [];

  for (const [key, raw] of Object.entries(values)) {
    if (raw === undefined) continue;
    if (!isSettingKey(key)) {
      errors[key] = "unknown_setting";
    } else if (isBlank(raw)) {
      cleared.push(key);
    } else {
      const parsed = parseSetting(key, raw);
      if (parsed.ok) toSave.push([key, parsed.value]);
      else errors[key] = parsed.code;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const updated = toSave.map(([key]) => key);
  if (updated.length === 0 && cleared.length === 0) return { ok: true, updated, cleared };

  try {
    const db = getDb();
    await db.$transaction([
      ...toSave.map(([key, value]) => {
        const data = { value, isPublic: SETTING_KEYS[key].isPublic, updatedById: actor.id };
        return db.siteSetting.upsert({ where: { key }, create: { key, ...data }, update: data });
      }),
      ...(cleared.length > 0
        ? [db.siteSetting.deleteMany({ where: { key: { in: cleared } } })]
        : []),
    ]);
  } catch (error) {
    throw toDatabaseError(error);
  }

  revalidateTag(SITE_SETTINGS_TAG, { expire: 0 });
  await writeAudit({
    actor,
    action: "settings.updated",
    entityType: "settings",
    summary: `Updated site settings: ${[...updated, ...cleared].join(", ")}`,
    metadata: { updated, cleared },
  });

  return { ok: true, updated, cleared };
}
