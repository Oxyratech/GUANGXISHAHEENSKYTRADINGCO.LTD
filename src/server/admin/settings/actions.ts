"use server";

import { z } from "zod";
import { AdminActionError, defineAdminAction } from "@/server/admin/action";
import { updateSettings, type SettingsUpdate } from "@/server/settings";

/*
 * One Server Action for the whole settings form: updateSettings is already transactional and
 * validates every value itself (see @/server/settings/setting-keys), so this only maps its result
 * onto the form's field errors and audits. A blank field clears the setting (reverts to the
 * environment fallback, or to "not set"); it never means "leave unchanged" here, because the form
 * always shows and submits every field.
 */

const FIELD_MESSAGES: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  invalid_phone: "Enter a phone number in international format, e.g. +86 771 1234567.",
  invalid_whatsapp: "Enter a WhatsApp number in international format, e.g. +86 771 1234567.",
  unknown_setting: "This setting is not recognised.",
};

const text = (max: number) => z.string().max(max, `At most ${max} characters`);

export const updateContactSettings = defineAdminAction({
  name: "settings.update",
  permission: "settings:write",
  schema: z.object({
    "contact.email": text(254),
    "contact.phone": text(40),
    "contact.whatsapp": text(40),
  }),
  handler: async ({ input, session }) => {
    const values: SettingsUpdate = {
      "contact.email": input["contact.email"],
      "contact.phone": input["contact.phone"],
      "contact.whatsapp": input["contact.whatsapp"],
    };

    const result = await updateSettings({ id: session.user.id, email: session.user.email }, values);
    if (!result.ok) {
      const fieldErrors: Record<string, string[]> = {};
      for (const [key, code] of Object.entries(result.errors)) {
        fieldErrors[key] = [FIELD_MESSAGES[code] ?? "This value is not valid."];
      }
      throw new AdminActionError("Please correct the highlighted fields.", fieldErrors);
    }

    // updateSettings already wrote its own audit entry naming the keys touched.
    return { data: null, message: "Settings saved." };
  },
});
