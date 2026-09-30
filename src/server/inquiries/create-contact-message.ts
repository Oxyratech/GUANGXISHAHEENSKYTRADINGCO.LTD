import "server-only";
import type { Locale } from "@/i18n/locales";
import type { ContactData } from "@/lib/validation/contact";
import { getDb, toDatabaseError } from "@/server/db";
import { createWithReferenceCode } from "./reference-code";

export interface NewContactMessage {
  data: ContactData;
  locale: Locale;
  ipHash: string;
  userAgent: string | null;
  consentAcceptedAt: Date;
}

const orNull = (value: string): string | null => (value === "" ? null : value);

/** Stores a message from the contact form (status NEW) under a fresh "MSG-" reference code. */
export async function createContactMessage(
  input: NewContactMessage,
): Promise<{ id: string; referenceCode: string }> {
  const { data, locale, ipHash, userAgent, consentAcceptedAt } = input;

  try {
    return await createWithReferenceCode("MSG", async (referenceCode) => {
      const row = await getDb().contactMessage.create({
        data: {
          referenceCode,
          status: "NEW",
          name: data.name,
          company: orNull(data.company),
          email: data.email,
          phone: orNull(data.phone),
          country: orNull(data.country),
          message: data.message,
          locale,
          consentAcceptedAt,
          ipHash,
          userAgent,
        },
        select: { id: true },
      });
      return { id: row.id, referenceCode };
    });
  } catch (error) {
    throw toDatabaseError(error);
  }
}
