import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

// Rows created in one transaction share a createdAt, so id breaks the tie and the
// order stays stable. This is also the order the "oldest remaining inherits the
// main flag" rule follows, so it lives in one place — the delete handlers and the
// export include import it rather than restating the literal.
export const CHRONO_ORDER = [{ createdAt: "asc" as const }, { id: "asc" as const }];

/**
 * Every mutating contacts/locations route answers with the resulting collection
 * rather than the single row it touched: one write can change two rows (promoting
 * one demotes another, deleting the main promotes its successor), so returning the
 * whole list is what lets the client replace its state instead of trying to patch
 * it into agreement with the server.
 */
export function listContacts(snailId: number) {
  return prisma.contact.findMany({ where: { snailId }, orderBy: CHRONO_ORDER });
}

export function listLocations(snailId: number) {
  return prisma.location.findMany({ where: { snailId }, orderBy: CHRONO_ORDER });
}

/**
 * The contact/location that represents the snail: the one flagged primary,
 * falling back to the first row (oldest, when the rows were loaded with
 * CHRONO_ORDER).
 */
export function primary<T extends { isPrimary: boolean }>(rows: T[]): T | undefined {
  return rows.find((r) => r.isPrimary) ?? rows[0];
}

/**
 * Enforce the exactly-one-primary invariant on rows about to be created
 * together: the first row flagged primary keeps the flag, every other flag is
 * dropped, and if none was flagged the first row becomes primary.
 */
export function withSinglePrimary<T extends { isPrimary: boolean }>(rows: T[]): T[] {
  let taken = false;
  const out = rows.map((row) => {
    const isPrimary = row.isPrimary && !taken;
    if (isPrimary) taken = true;
    return { ...row, isPrimary };
  });
  if (!taken && out.length) out[0] = { ...out[0], isPrimary: true };
  return out;
}

/**
 * The subset of a Prisma delegate the shared invariant helpers below need.
 * Both prisma.contact and prisma.location satisfy it, inside and outside a
 * transaction, which is what lets one implementation own the trickiest logic
 * in the CRM instead of two parallel copies per model.
 */
type RelationDelegate = {
  findFirst(args: {
    where: { snailId: number; id?: number };
    select?: { id: boolean };
    orderBy?: typeof CHRONO_ORDER;
  }): PromiseLike<{ id: number } | null>;
  findUnique(args: { where: { id: number } }): PromiseLike<{ isPrimary: boolean } | null>;
  updateMany(args: {
    where: { snailId: number; isPrimary: boolean; id: { not: number } };
    data: { isPrimary: boolean };
  }): PromiseLike<unknown>;
  update(args: { where: { id: number }; data: Record<string, unknown> }): PromiseLike<unknown>;
  delete(args: { where: { id: number } }): PromiseLike<{ isPrimary: boolean }>;
  count(args: { where: { snailId: number; id: { not: number } } }): PromiseLike<number>;
};

type PickDelegate = (client: Prisma.TransactionClient) => RelationDelegate;

export type RelationWriteError = "not_found" | "cannot_unset_primary" | "last_row";

/**
 * Update one contact/location scoped to its snail, holding the exactly-one-
 * primary invariant: the primary flag can't be unset directly (promote another
 * row instead), and promoting a row demotes the incumbent in the same
 * transaction. Returns null on success; the route maps errors to HTTP copy.
 */
export async function updateRelationRow(
  pick: PickDelegate,
  snailId: number,
  rowId: number,
  data: Record<string, unknown>
): Promise<RelationWriteError | null> {
  // Scope to the snail in the path: the invariants below are checked against
  // this snail, so the target must belong to it.
  const owned = await pick(prisma).findFirst({
    where: { snailId, id: rowId },
    select: { id: true },
  });
  if (!owned) return "not_found";

  if (data.isPrimary === false) {
    const current = await pick(prisma).findUnique({ where: { id: rowId } });
    if (current?.isPrimary) return "cannot_unset_primary";
  }

  await prisma.$transaction(async (tx) => {
    if (data.isPrimary === true) {
      await pick(tx).updateMany({
        where: { snailId, isPrimary: true, id: { not: rowId } },
        data: { isPrimary: false },
      });
    }
    return pick(tx).update({ where: { id: rowId }, data });
  });
  return null;
}

/**
 * Delete one contact/location scoped to its snail: a snail keeps at least one
 * row, and removing the primary hands the flag to the oldest remaining row
 * (CHRONO_ORDER) in the same transaction.
 */
export async function deleteRelationRow(
  pick: PickDelegate,
  snailId: number,
  rowId: number
): Promise<RelationWriteError | null> {
  const owned = await pick(prisma).findFirst({
    where: { snailId, id: rowId },
    select: { id: true },
  });
  if (!owned) return "not_found";

  const remaining = await pick(prisma).count({
    where: { snailId, id: { not: rowId } },
  });
  if (remaining === 0) return "last_row";

  await prisma.$transaction(async (tx) => {
    const removed = await pick(tx).delete({ where: { id: rowId } });
    if (removed.isPrimary) {
      const next = await pick(tx).findFirst({
        where: { snailId },
        orderBy: CHRONO_ORDER,
      });
      if (next) {
        await pick(tx).update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }
  });
  return null;
}
