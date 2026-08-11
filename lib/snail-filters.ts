// The single source of truth for how the admin Snails list is filtered. Both the
// list endpoint (which paints the table and the tab-count badges) and the export
// endpoint build their Prisma `where` from here, so a spreadsheet always matches
// what's on screen and the two can never drift apart.
import { Prisma } from "@/app/generated/prisma/client";

export const SNAIL_TABS = ["leads", "active", "lapsed", "all"] as const;
export type SnailTab = (typeof SNAIL_TABS)[number];

/** Coerce an untrusted query-param value to a known tab, defaulting to "leads". */
export function parseTab(value: string | null): SnailTab {
  return SNAIL_TABS.includes(value as SnailTab) ? (value as SnailTab) : "leads";
}

// The tab rule as a Prisma filter. A lead with no stage still counts as a lead:
// the explicit `stage: null` branch keeps that unambiguous rather than leaning on
// Prisma's null-inclusive `notIn`, and matches the old client check
// `stage !== "lapsed" && stage !== "deferred"`.
export function tabWhere(tab: SnailTab): Prisma.SnailWhereInput {
  switch (tab) {
    case "active":
      return { track: "active" };
    case "leads":
      return {
        track: "lead",
        OR: [{ stage: null }, { stage: { notIn: ["lapsed", "deferred"] } }],
      };
    case "lapsed":
      return { track: "lead", formerAwardee: true, stage: "lapsed" };
    case "all":
      return {};
  }
}

export type SnailListFilters = {
  tab: SnailTab;
  mine?: boolean;
  notOnMap?: boolean;
  /** The signed-in user's id; required to resolve `mine`. */
  userId?: number | null;
};

/**
 * The full list `where`: the tab rule narrowed by the two view toggles. The tab
 * clauses never touch `assigneeId` or `onSfusaMap`, so the toggles compose by
 * plain assignment. `mine` with no known user matches nothing (id -1), mirroring
 * the old client behavior where an unresolved user hid every row.
 */
export function snailListWhere({
  tab,
  mine,
  notOnMap,
  userId,
}: SnailListFilters): Prisma.SnailWhereInput {
  const where: Prisma.SnailWhereInput = { ...tabWhere(tab) };
  if (mine) where.assigneeId = userId ?? -1;
  if (notOnMap) where.onSfusaMap = false;
  return where;
}
