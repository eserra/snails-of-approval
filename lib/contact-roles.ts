// Roles a Snail contact can hold. Stored as a String[] on Contact.roles,
// following the codebase convention of String enums documented inline (see
// Snail.status, User.role).
//
// A contact holds any number of these at once — a chef who is also the owner is
// one person with two roles, not two contact rows, and not a combined
// "chef_owner" value (see the substring note below for why that breaks).
//
// There is deliberately no "general" catch-all. It meant "we don't know this
// person's role", which an empty list already says — and as a stored value it
// was indistinguishable from a real role to anything trying to segment on one.
export const contactRoles = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "chef", label: "Chef" },
  { value: "pr_media", label: "PR / Media" },
] as const;

export type ContactRole = (typeof contactRoles)[number]["value"];

export function contactRoleLabel(value: string): string {
  return contactRoles.find((r) => r.value === value)?.label ?? value;
}

/**
 * Display form for a contact's set of roles. Empty is left empty rather than
 * given a placeholder here — callers decide whether the absence reads as
 * "unknown" (admin) or as nothing at all (public pages).
 */
export function contactRolesLabel(values: string[]): string {
  return values.map(contactRoleLabel).join(" / ");
}

/**
 * Narrow untrusted request input to known roles, deduped and in the canonical
 * order above. Anything unrecognised is dropped rather than stored: these values
 * are written verbatim into the Mailchimp ROLE field that segments match with
 * `contains`, so a stray "owner-ish" would quietly land in the Owner segment.
 */
export function sanitizeRoles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const wanted = new Set(input.filter((v): v is string => typeof v === "string"));
  return contactRoles.filter((r) => wanted.has(r.value)).map((r) => r.value);
}

// A contact's roles go into the single Mailchimp ROLE merge field as a joined
// string, so a segment targeting one role has to match with `contains` rather
// than `is`. That only stays correct while no role value is a substring of
// another: add "co_owner" and `contains "owner"` would silently match it too,
// quietly widening the Owner segment.
//
// Dev-only so a bad edit surfaces immediately while running the app, without
// giving a hardcoded list the power to crash production.
if (process.env.NODE_ENV !== "production") {
  for (const outer of contactRoles) {
    for (const inner of contactRoles) {
      if (outer !== inner && outer.value.includes(inner.value)) {
        throw new Error(
          `Contact role "${outer.value}" contains "${inner.value}". Mailchimp ` +
            `segments match roles with "contains", so this would silently pull ` +
            `"${outer.value}" contacts into the "${inner.value}" segment. Rename one.`
        );
      }
    }
  }
}
