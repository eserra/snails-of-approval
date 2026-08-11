type AttachmentRequirement = {
  type: "attachment";
  category: string;
  label: string;
};

type FieldRequirement = {
  type: "field";
  field: string;
  label: string;
};

export type StageRequirement = AttachmentRequirement | FieldRequirement;

export type StageWarning = {
  label: string;
  met: boolean;
};

export const stageRequirements: Record<string, StageRequirement[]> = {
  applied: [
    { type: "attachment", category: "application", label: "Application PDF" },
  ],
  visited: [
    {
      type: "attachment",
      category: "site-visit-report",
      label: "Site Visit Report",
    },
  ],
  // The committee writes this after the application and the site visit; the board
  // votes on it, so it has to exist before a snail is submitted for review.
  board_review: [
    {
      type: "field",
      field: "recommendation",
      label: "Committee recommendation",
    },
  ],
};

/** CTA hints encouraging the volunteer to advance the snail to the next stage */
export const stageCTAHints: Record<string, string> = {
  new: "Reach out to this lead",
  contacted: "Send or collect the application form",
  applied: "Schedule a site visit",
  visited: "Write the committee recommendation, then submit to the board",
  board_review: "Record the board's decision below",
  deferred: "Applicant may reapply when ready — reopen to continue",
  onboarding: "Deliver the award package: stickers, digital assets, welcome letter, certificate",
  active: "Monitor until renewal is due",
  renewal_due: "Request renewal submission",
  renewal_submitted: "Review renewal application",
};

export function validateStageChange(
  newStage: string,
  snail: {
    attachments?: { category: string }[];
    [key: string]: unknown;
  }
): StageWarning[] {
  const requirements = stageRequirements[newStage];
  if (!requirements) return [];

  return requirements.map((req) => {
    if (req.type === "attachment") {
      const has = snail.attachments?.some((a) => a.category === req.category);
      return { label: req.label, met: !!has };
    }
    return { label: req.label, met: !!snail[req.field] };
  });
}
