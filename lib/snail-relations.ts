import { prisma } from "@/lib/prisma";

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
