/*
 * Optimistic concurrency for admin-edited records (docs/DATABASE.md section 4). A form carries the
 * `version` it loaded; the write only lands if that version is still current, and bumps it.
 * Otherwise someone saved first and the editor must reload instead of silently overwriting.
 */

export const CONFLICT_MESSAGE = "This record was changed by someone else. Reload and try again.";

/** Thrown when a write found the record at a different version (or no longer there). */
export class ConflictError extends Error {
  constructor(message: string = CONFLICT_MESSAGE) {
    super(message);
    this.name = "ConflictError";
  }
}

export interface VersionRef {
  id: string;
  version: number;
}

/** The slice of a Prisma model delegate (`db.product`, `db.newsArticle`, ...) this helper needs. */
interface VersionedDelegate {
  updateMany(args: {
    where: VersionRef;
    data: { version: { increment: 1 } };
  }): PromiseLike<{ count: number }>;
}

/** The columns a delegate's `updateMany` accepts, so a misspelt column fails to compile. */
type UpdateData<D extends VersionedDelegate> =
  NonNullable<Parameters<D["updateMany"]>[0]> extends { data: infer Data } ? Data : never;

/**
 * Updates the row `{ id, version }` and increments its version in the same statement. Run it inside
 * the same transaction as any related writes (`db.$transaction(async (tx) => ...)`, passing `tx.product`).
 *
 * @throws ConflictError when no row matched: another editor saved first, or the row was deleted.
 */
export async function updateWithVersion<D extends VersionedDelegate>(
  delegate: D,
  ref: VersionRef,
  data: UpdateData<D>,
): Promise<void> {
  const { count } = await delegate.updateMany({
    where: { id: ref.id, version: ref.version },
    // The version bump comes last so a caller-supplied `version` can never win.
    data: { ...(data as object), version: { increment: 1 } },
  });
  if (count === 0) throw new ConflictError();
}
