// Operating status of a Snail's establishment. Stored as a machine-readable String on
// Snail.businessStatus, following the codebase convention of String enums documented
// inline (see Snail.status, User.role, Contact.role).
export const businessStatuses = [
  { value: "active", label: "Confirmed - Active (In Business)" },
  { value: "permanently_closed", label: "Confirmed - Permanently closed" },
  { value: "to_be_confirmed", label: "To Be Confirmed" },
] as const;

export type BusinessStatus = (typeof businessStatuses)[number]["value"];

export function businessStatusLabel(value: string | null): string {
  if (!value) return "";
  return businessStatuses.find((s) => s.value === value)?.label ?? value;
}
