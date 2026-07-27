// Roles a Snail contact can hold. Stored as a String on Contact.role, following the
// codebase convention of String enums documented inline (see Snail.status, User.role).
// A snail may have any number of contacts in any role (e.g. multiple owners).
export const contactRoles = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "chef", label: "Chef" },
  { value: "pr_media", label: "PR / Media" },
  { value: "general", label: "General" },
] as const;

export type ContactRole = (typeof contactRoles)[number]["value"];

export function contactRoleLabel(value: string): string {
  return contactRoles.find((r) => r.value === value)?.label ?? value;
}
