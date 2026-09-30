"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CONTACT_MESSAGE_STATUSES, type ContactMessageStatus } from "@/lib/domain/statuses";
import { AdminActionError, defineAdminAction, id } from "@/server/admin/action";
import { getDb } from "@/server/db";

/*
 * Server Actions behind a contact message's detail page. ContactMessage carries no `version` column
 * (docs/DATABASE.md section 4 calls it low-contention and last-write-wins), so these are plain
 * conditional updates keyed by id, not optimistic-concurrency writes like the inquiry actions.
 */

function isContactStatus(value: string): value is ContactMessageStatus {
  return (CONTACT_MESSAGE_STATUSES as readonly string[]).includes(value);
}

const statusField = z.string({ error: "Choose a status." }).refine(isContactStatus, {
  error: "Choose a valid status.",
});

function revalidateContactMessage(messageId: string) {
  revalidatePath("/admin/contact-messages");
  revalidatePath(`/admin/contact-messages/${messageId}`);
}

async function loadOrThrow(messageId: string) {
  const message = await getDb().contactMessage.findUnique({
    where: { id: messageId },
    select: { id: true, status: true },
  });
  if (!message) throw new AdminActionError("This message no longer exists. Reload the page.");
  return message;
}

export const changeContactMessageStatus = defineAdminAction({
  name: "contactMessages.change_status",
  permission: "contact:update",
  schema: z.object({ id, status: statusField }),
  handler: async ({ input }) => {
    const current = await loadOrThrow(input.id);
    if (current.status === input.status) {
      throw new AdminActionError("The message is already in this status.");
    }

    await getDb().contactMessage.update({
      where: { id: input.id },
      data: { status: input.status },
    });

    revalidateContactMessage(input.id);
    return {
      data: { status: input.status },
      message: "Status updated.",
      audit: {
        action: "contact_message.status_changed",
        entityType: "contact_message",
        entityId: input.id,
        summary: `${current.status} → ${input.status}`,
      },
    };
  },
});

/** Marks the message handled by whoever is signed in now, without changing its status. */
export const markContactMessageHandled = defineAdminAction({
  name: "contactMessages.mark_handled",
  permission: "contact:update",
  schema: z.object({ id }),
  handler: async ({ input, session }) => {
    await loadOrThrow(input.id);

    await getDb().contactMessage.update({
      where: { id: input.id },
      data: { handledById: session.user.id },
    });

    revalidateContactMessage(input.id);
    return {
      data: { handledById: session.user.id },
      message: "Marked as handled by you.",
      audit: {
        action: "contact_message.handled",
        entityType: "contact_message",
        entityId: input.id,
        summary: `Marked handled by ${session.user.email}`,
      },
    };
  },
});
