// The single source of truth for how the admin Snails list is filtered. Both the
// list endpoint (which paints the table and the tab-count badges) and the export
// endpoint build their Prisma `where` from here, so a spreadsheet always matches
// what's on screen and the two can never drift apart.
import { Prisma } from "@/app/generated/prisma/client";
import { pipelineStages } from "@/lib/pipeline-stages";

export const SNAIL_TABS = ["leads", "active", "lapsed", "all"] as const;
export type SnailTab = (typeof SNAIL_TABS)[number];

/** Coerce an untrusted query-param value to a known tab, defaulting to "leads". */
export function parseTab(value: string | null): SnailTab {
  return SNAIL_TABS.includes(value as SnailTab) ? (value as SnailTab) : "leads";
}

/**
 * The stages a tab can be narrowed to, in funnel order.
 *
 * Only Leads and Active get a stage filter. "Lapsed" is already pinned to a
 * single stage, and "All" spans both funnels, so neither has a meaningful
 * sub-filter. "Blocked" is offered under Leads because the tab's rule admits it
 * (it excludes only lapsed and deferred) — without a chip, a blocked lead would
 * be visible under "all stages" and impossible to isolate.
 */
export function stagesForTab(tab: SnailTab): string[] {
  switch (tab) {
    case "leads":
      return [...pipelineStages.lead, "blocked"];
    case "active":
      return [...pipelineStages.active, "blocked"];
    case "lapsed":
    case "all":
      return [];
  }
}

/**
 * Coerce an untrusted stage param against the tab it arrived with. A stage that
 * the tab can't contain resolves to null — "no stage filter" — rather than
 * filtering the table down to nothing: a stale link like `tab=active&stage=
 * contacted` should show the Active tab, not an empty screen with no hint why.
 */
export function parseStage(tab: SnailTab, value: string | null): string | null {
  if (!value) return null;
  return stagesForTab(tab).includes(value) ? value : null;
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
  /**
   * One stage within the tab, already validated by parseStage. Omit it to get the
   * whole tab — which is what the per-stage counts are built from, so selecting a
   * stage doesn't zero every other chip.
   */
  stage?: string | null;
  /** The signed-in user's id; required to resolve `mine`. */
  userId?: number | null;
};

/**
 * The full list `where`: the tab rule narrowed by the view toggles and the stage
 * filter. The tab clauses never touch `assigneeId` or `onSfusaMap`, so those
 * compose by plain assignment. `mine` with no known user matches nothing (id -1),
 * mirroring the old client behavior where an unresolved user hid every row.
 *
 * The Leads tab's rule also mentions `stage` (it excludes lapsed and deferred),
 * and a specific stage ANDs with that rather than replacing it — parseStage only
 * ever yields a stage the tab admits, so the two can't contradict.
 */
export function snailListWhere({
  tab,
  mine,
  notOnMap,
  stage,
  userId,
}: SnailListFilters): Prisma.SnailWhereInput {
  const where: Prisma.SnailWhereInput = { ...tabWhere(tab) };
  if (mine) where.assigneeId = userId ?? -1;
  if (notOnMap) where.onSfusaMap = false;
  if (stage) where.stage = stage;
  return where;
}
