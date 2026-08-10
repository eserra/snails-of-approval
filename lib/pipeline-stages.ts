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
