import "server-only";
import { getDb } from "@/server/db";
import { toDatabaseError } from "@/server/db/errors";

export interface ContactMessageDetail {
  id: string;
  referenceCode: string;
  status: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  message: string;
  locale: string;
  consentAcceptedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  handledBy: { id: string; name: string; email: string } | null;
}

/** A contact message's full record, or `null` when the id does not exist. */
export async function getContactMessageDetail(id: string): Promise<ContactMessageDetail | null> {
  try {
    return await getDb().contactMessage.findUnique({
      where: { id },
      select: {
        id: true,
        referenceCode: true,
        status: true,
        name: true,
        company: true,
        email: true,
        phone: true,
        country: true,
        message: true,
        locale: true,
        consentAcceptedAt: true,
        createdAt: true,
        updatedAt: true,
        handledBy: { select: { id: true, name: true, email: true } },
      },
    });
  } catch (error) {
    throw toDatabaseError(error);
  }
}
