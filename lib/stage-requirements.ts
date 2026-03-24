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
  "Application Filled": [
    { type: "attachment", category: "application", label: "Application PDF" },
  ],
  "Up for Vote": [
    {
      type: "attachment",
      category: "site-visit-report",
      label: "Site Visit Report",
    },
  ],
};

/** Ordered pipeline stages per track (excluding side-track states like Blocked/Lapsed) */
export const pipelineStages: Record<string, string[]> = {
  lead: [
    "New",
    "Contacted",
    "Application Filled",
    "Site Visit Completed",
    "Up for Vote",
  ],
  active: ["Onboarding", "Active", "Renewal Due", "Renewal Submitted"],
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
    if (req.type === "field") {
      return { label: req.label, met: !!snail[req.field] };
    }
    return { label: "Unknown requirement", met: false };
  });
}
