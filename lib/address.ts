import { boroughs } from "./location-kinds";

/** A Nominatim hit, reduced to the fields a Location needs. */
export type ResolvedAddress = {
  address: string;
  city: string;
  state: string;
  zip: string;
  borough: string;
  latitude: string;
  longitude: string;
};

export type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  borough?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  county?: string;
  state?: string;
  postcode?: string;
  ["ISO3166-2-lvl4"]?: string;
};

export type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  class: string;
  type: string;
  name?: string;
  address?: NominatimAddress;
};

/**
 * Keep anything that sits on a named street. Business POIs are kept rather than
 * filtered out — OSM frequently has only the business node for a real address
 * (Roberta's is the only record of 261 Moore St), so dropping them by class loses
 * the address entirely. The business name is discarded instead: every label and
 * stored value below is rebuilt from the structured fields, so "The Village
 * Underground" never reaches the address input. What this does drop is results
 * with no street at all — cities, counties, parks, regions.
 */
export function isAddressResult(r: NominatimResult): boolean {
  return !!r.address?.road;
}

/**
 * Identity of a street address, ignoring the postcode: several POIs at one
 * address can disagree on the ZIP (130 West 3rd Street comes back as both 10012
 * and 10014), and showing that twice looks like two different places.
 */
export function addressKey(r: NominatimResult): string {
  const a = resolveAddress(r);
  return [a.address, a.borough, a.city, a.state]
    .map((p) => p.trim().toLowerCase())
    .join("|");
}

// Nominatim usually reports the borough as `suburb`; county is the fallback for
// the records that omit it.
const COUNTY_TO_BOROUGH: Record<string, string> = {
  "new york county": "Manhattan",
  "kings county": "Brooklyn",
  "queens county": "Queens",
  "bronx county": "The Bronx",
  "richmond county": "Staten Island",
};

const BOROUGH_ALIASES: Record<string, string> = { bronx: "The Bronx" };

function matchBorough(value?: string): string {
  if (!value) return "";
  const v = value.trim().toLowerCase();
  const direct = boroughs.find((b) => b.toLowerCase() === v && b !== "Other");
  return direct || BOROUGH_ALIASES[v] || "";
}

/** The NYC borough for an address, or "" when it isn't in one. */
export function boroughFor(a: NominatimAddress): string {
  for (const field of [a.borough, a.suburb, a.city_district]) {
    const match = matchBorough(field);
    if (match) return match;
  }
  return COUNTY_TO_BOROUGH[(a.county || "").trim().toLowerCase()] || "";
}

/** "New York" -> "NY", via the ISO code Nominatim already provides. */
function stateCode(a: NominatimAddress): string {
  const iso = a["ISO3166-2-lvl4"];
  if (iso?.startsWith("US-")) return iso.slice(3);
  return a.state || "";
}

function streetLine(r: NominatimResult): string {
  const a = r.address || {};
  const line = [a.house_number, a.road].filter(Boolean).join(" ");
  // A result with no road at all (rare) still has its display_name to fall back on.
  return line || a.road || r.display_name.split(",")[0] || "";
}

export function resolveAddress(r: NominatimResult): ResolvedAddress {
  const a = r.address || {};
  return {
    address: streetLine(r),
    city: a.city || a.town || a.village || a.hamlet || "",
    state: stateCode(a),
    zip: a.postcode || "",
    borough: boroughFor(a),
    latitude: r.lat,
    longitude: r.lon,
  };
}

/**
 * The suggestion text: street, borough, city, state ZIP. Deliberately drops the
 * neighbourhood and county that clutter Nominatim's display_name (a result in
 * "University Village, Manhattan, New York County, New York" reads as
 * "130 West 3rd Street, Manhattan, New York, NY 10012").
 */
export function formatSuggestion(r: NominatimResult): string {
  const resolved = resolveAddress(r);
  return [
    resolved.address,
    resolved.borough,
    resolved.city,
    [resolved.state, resolved.zip].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}
