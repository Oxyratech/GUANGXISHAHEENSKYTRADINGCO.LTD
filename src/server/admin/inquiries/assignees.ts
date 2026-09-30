import "server-only";
import { getDb } from "@/server/db";
import { toDatabaseError } from "@/server/db/errors";

export interface AssigneeOption {
  id: string;
  name: string;
  email: string;
}

/**
 * Active admin users, for the "assign to" filter and form. Deactivated staff never appear, so an
 * inquiry cannot be handed to someone who can no longer sign in — the assignment action re-checks
 * this on the server, this list is only what a well-behaved browser offers.
 */
export async function listAssignableUsers(): Promise<AssigneeOption[]> {
  try {
    const rows = await getDb().user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    return rows;
  } catch (error) {
    throw toDatabaseError(error);
  }
}
