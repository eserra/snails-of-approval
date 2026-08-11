export const attachmentConfig: Record<
  string,
  { label: string; maxCount: number }
> = {
  application: { label: "Application", maxCount: 1 },
  "site-visit-report": { label: "Site Visit Report", maxCount: 1 },
};

// Enforced server-side on upload and mirrored in the FileUpload pre-check.
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENT_LABEL = "10MB";
