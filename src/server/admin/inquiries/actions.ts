"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isInquiryStatus } from "@/lib/domain/statuses";
import {
  AdminActionError,
  defineAdminAction,
  id,
  requiredString,
  version,
} from "@/server/admin/action";
import { updateWithVersion } from "@/server/admin/concurrency";
import { getDb } from "@/server/db";

/*
 * Server Actions behind an inquiry's detail page: change status, (re)assign, add an internal note.
 * Every one requires its own permission (inquiry:update or inquiry:note) on the server, validates
 * with zod, and writes an audit entry after it succeeds. Status changes and their history row are
 * written in one transaction so an inquiry never shows a status with no matching history entry.
 */

const statusField = z.string({ error: "Choose a status." }).refine(isInquiryStatus, {
  error: "Choose a valid status.",
});

/** "" (the unassigned option in the <select>) becomes null; anything else must be a real GUID. */
const assigneeIdField = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.union([id, z.null()]),
);

function revalidateInquiry(inquiryId: string) {
  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${inquiryId}`);
}

export const changeInquiryStatus = defineAdminAction({
  name: "inquiries.change_status",
  permission: "inquiry:update",
  schema: z.object({ id, version, status: statusField }),
  handler: async ({ input, session }) => {
    const db = getDb();

    const fromStatus = await db.$transaction(async (tx) => {
      const current = await tx.businessInquiry.findUnique({
        where: { id: input.id },
        select: { status: true },
      });
      if (current?.status === input.status) {
        throw new AdminActionError("The inquiry is already in this status.");
      }

      // Same statement bumps `version`; a row moved since the form loaded throws ConflictError.
      await updateWithVersion(
        tx.businessInquiry,
        { id: input.id, version: input.version },
        {
          status: input.status,
        },
      );
      await tx.inquiryStatusChange.create({
        data: {
          inquiryId: input.id,
          fromStatus: current?.status ?? null,
          toStatus: input.status,
          changedById: session.user.id,
        },
      });
      return current?.status ?? null;
    });

    revalidateInquiry(input.id);
    return {
      data: { status: input.status },
      message: "Status updated.",
      audit: {
        action: "inquiry.status_changed",
        entityType: "inquiry",
        entityId: input.id,
        summary: `${fromStatus ?? "(new)"} → ${input.status}`,
      },
    };
  },
});

export const assignInquiry = defineAdminAction({
  name: "inquiries.assign",
  permission: "inquiry:update",
  schema: z.object({ id, version, assigneeId: assigneeIdField }),
  handler: async ({ input }) => {
    const db = getDb();

    let assigneeName: string | null = null;
    if (input.assigneeId) {
      const assignee = await db.user.findUnique({
        where: { id: input.assigneeId },
        select: { isActive: true, name: true },
      });
      if (!assignee || !assignee.isActive) {
        throw new AdminActionError("Choose an active admin user.", {
          assigneeId: ["Choose an active admin user."],
        });
      }
      assigneeName = assignee.name;
    }

    await updateWithVersion(
      db.businessInquiry,
      { id: input.id, version: input.version },
      {
        assignedToId: input.assigneeId,
      },
    );

    revalidateInquiry(input.id);
    const summary = assigneeName ? `Assigned to ${assigneeName}` : "Unassigned";
    return {
      data: { assigneeId: input.assigneeId },
      message: summary,
      audit: {
        action: "inquiry.assigned",
        entityType: "inquiry",
        entityId: input.id,
        summary,
      },
    };
  },
});

export const addInquiryNote = defineAdminAction({
  name: "inquiries.add_note",
  permission: "inquiry:note",
  schema: z.object({ id, body: requiredString(4000) }),
  handler: async ({ input, session }) => {
    const db = getDb();

    const exists = await db.businessInquiry.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (!exists) throw new AdminActionError("This inquiry no longer exists. Reload the page.");

    const note = await db.inquiryNote.create({
      data: { inquiryId: input.id, authorId: session.user.id, body: input.body },
      select: { id: true, body: true, createdAt: true },
    });

    revalidateInquiry(input.id);
    return {
      data: { id: note.id, body: note.body, createdAt: note.createdAt.toISOString() },
      message: "Note added.",
      audit: {
        action: "inquiry.note_added",
        entityType: "inquiry",
        entityId: input.id,
        summary: "Internal note added",
      },
    };
  },
});
