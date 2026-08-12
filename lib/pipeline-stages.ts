// Where a snail sits in the pipeline. Stored as a machine-readable String on
// Snail.stage, following the codebase convention of String enums documented
// inline (see Snail.status, Contact.role, lib/business-status.ts).
//
// Each stage belongs to a track ("lead" or "active"), or to neither — the side
// tracks are states a snail can be parked in from anywhere in its funnel.
//
// Naming note: `board_review` was called "Voted", which described the stage a
// snail had already left. A snail sits here *awaiting* the board's vote;
// recording the decision moves it straight to `onboarding` or `deferred`.

export type StageTrack = "lead" | "active";

type Stage = {
  value: string;
  label: string;
  /** Position in a track's ordered funnel, or "side" for parked states. */
  track: StageTrack | "side";
};

export const stages: Stage[] = [
  // Lead funnel, in order
  { value: "new", label: "New", track: "lead" },
  { value: "contacted", label: "Contacted", track: "lead" },
  { value: "applied", label: "Applied", track: "lead" },
  { value: "visited", label: "Visited", track: "lead" },
  { value: "board_review", label: "Board Review", track: "lead" },
  // Active funnel, in order
  { value: "onboarding", label: "Onboarding", track: "active" },
  { value: "active", label: "Active", track: "active" },
  { value: "renewal_due", label: "Renewal Due", track: "active" },
  { value: "renewal_submitted", label: "Renewal Submitted", track: "active" },
  // Side tracks (no linear "next" step)
  { value: "blocked", label: "Blocked", track: "side" },
  { value: "lapsed", label: "Lapsed", track: "side" },
  { value: "deferred", label: "Deferred", track: "side" },
];

export function stageLabel(value: string | null): string {
  if (!value) return "";
  return stages.find((s) => s.value === value)?.label ?? value;
}

/** Ordered funnel per track, excluding side tracks. */
export const pipelineStages: Record<string, string[]> = {
  lead: stages.filter((s) => s.track === "lead").map((s) => s.value),
  active: stages.filter((s) => s.track === "active").map((s) => s.value),
};

/** States that sit outside the ordered funnel. */
export const sideTrackStages = stages
  .filter((s) => s.track === "side")
  .map((s) => s.value);

/** Everything a snail on this track can be set to, funnel plus side tracks. */
export function stagesForTrack(track: string): Stage[] {
  return stages.filter((s) => s.track === track || s.track === "side");
}

/** Position of a stage within its track's funnel; -1 for side tracks and unknowns. */
export function stageIndex(track: string, stage: string | null): number {
  if (!stage) return -1;
  return (pipelineStages[track] ?? []).indexOf(stage);
}

export type StageMove = {
  /** Whether the move may happen at all. */
  allowed: boolean;
  /**
   * True when the snail genuinely moved on, false when someone is fixing the
   * record. Callers use this to decide whether the move counts as engagement:
   * correcting a mis-click is not a touch, and treating it as one would put the
   * snail back at the bottom of the follow-up list under false pretences.
   */
  isProgress: boolean;
  /** Why not, for the error the caller shows. Absent when allowed. */
  reason?: string;
};

/**
 * The one definition of a legal stage change: the pipeline bar renders from it
 * and POST /advance enforces it, so the rules can't drift between what the UI
 * offers and what the server accepts.
 *
 * Forward moves go one stage at a time, because the per-stage requirements
 * (application PDF, site visit report) only ever get checked by passing through
 * each stage — allowing jumps would skip them silently. Backwards moves are
 * unrestricted: they're corrections, and making someone click back through four
 * stages to undo one mistake is how records stay wrong.
 *
 * Requirements themselves are deliberately not enforced here. They're advisory
 * — a document often arrives by email before anyone uploads it — and admins are
 * meant to be able to override. This function governs the shape of the funnel,
 * not the paperwork.
 */
export function evaluateStageMove(
  track: string,
  from: string | null,
  to: string
): StageMove {
  const funnel = pipelineStages[track] ?? [];
  const toIndex = funnel.indexOf(to);

  if (toIndex === -1) {
    return {
      allowed: false,
      isProgress: false,
      reason: `"${to}" is not a stage on the ${track} track`,
    };
  }

  const fromIndex = stageIndex(track, from);

  // Off the funnel entirely (blocked, lapsed, deferred): there's no ordering to
  // respect when you aren't in the order, so the snail re-enters wherever fits.
  // Picking it back up is real engagement, so it counts as progress.
  if (fromIndex === -1) {
    return { allowed: true, isProgress: true };
  }

  if (toIndex === fromIndex) {
    return {
      allowed: false,
      isProgress: false,
      reason: `already at ${stageLabel(to)}`,
    };
  }

  // Backwards, to any earlier stage — a correction, not a touch.
  if (toIndex < fromIndex) {
    return { allowed: true, isProgress: false };
  }

  if (toIndex === fromIndex + 1) {
    return { allowed: true, isProgress: true };
  }

  return {
    allowed: false,
    isProgress: false,
    reason: `a snail advances one stage at a time — ${stageLabel(
      funnel[fromIndex + 1]
    )} comes before ${stageLabel(to)}`,
  };
}

/**
 * The committee writes its recommendation once the site visit is done, and the
 * board votes on it — so it is relevant from `visited` onward, and for every
 * active awardee. Snails that already have one keep showing it wherever they
 * end up (deferred, lapsed), so the record is never hidden.
 */
export function hasRecommendationStage(
  track: string,
  stage: string | null,
  recommendation?: string | null
): boolean {
  if (recommendation) return true;
  if (track === "active") return true;
  return stageIndex("lead", stage) >= stageIndex("lead", "visited");
}
