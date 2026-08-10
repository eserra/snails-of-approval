// Qualifier for a Snail location. Stored as a String on Location.kind, following the
// codebase convention of String enums documented inline (see Snail.status, Contact.role).
// A snail may have any number of locations of any kind; exactly one is the main one
// (Location.isPrimary), which is what gets exported to the SFUSA map.
export const locationKinds = [
  { value: "storefront", label: "Storefront" },
  { value: "office", label: "Office" },
  { value: "headquarters", label: "Headquarters" },
  { value: "production", label: "Production / Kitchen" },
  { value: "farm", label: "Farm" },
  { value: "market_stall", label: "Market stall" },
  { value: "warehouse", label: "Warehouse / Distribution" },
  { value: "popup", label: "Pop-up / Seasonal" },
  { value: "mailing", label: "Mailing address" },
  { value: "other", label: "Other" },
] as const;

export type LocationKind = (typeof locationKinds)[number]["value"];

export function locationKindLabel(value: string | null): string {
  if (!value) return "";
  return locationKinds.find((k) => k.value === value)?.label ?? value;
}

// NYC boroughs, for the SFNYC chapter's addresses.
export const boroughs = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "The Bronx",
  "Staten Island",
  "Other",
] as const;
