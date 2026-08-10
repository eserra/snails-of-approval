import { boroughs } from "./location-kinds";

/** A geocoder hit, reduced to the fields a Location needs. */
export type ResolvedAddress = {
  address: string;
  city: string;
  state: string;
  zip: string;
  borough: string;
  latitude: string;
  longitude: string;
};

/**
 * A Photon feature (https://photon.komoot.io). Photon serves the same
 * OpenStreetMap data as Nominatim but is built for typeahead: it matches
 * partial input, where Nominatim parses the query as a whole address and gives
 * up on anything unfinished ("201 West 72nd" returned a road in Utah).
 *
 * Nominatim still does the geocoding in lib/geocode.ts, where the address is
 * complete and one accurate answer matters more than incremental matching.
 */
export type PhotonFeature = {
  geometry: { coordinates: [number, number] }; // [lon, lat]
  properties: {
    osm_key?: string;
    osm_value?: string;
    type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    countrycode?: string;
  };
};

/**
 * Keep anything that sits on a named street, in the US. Business POIs are kept
 * rather than filtered out — OSM frequently has only the business node for a
 * real address (Roberta's is the only record of 261 Moore St), so dropping them
 * would lose the address entirely. The business name is discarded instead:
 * every label and stored value below is rebuilt from the structured fields, so
 * "The Village Underground" never reaches the address input. What this does
 * drop is results with no street at all — cities, parks, regions.
 */
export function isAddressResult(f: PhotonFeature): boolean {
  const p = f.properties;
  return !!p.street && (p.countrycode ?? "US") === "US";
}

// Photon reports the borough as `district`; county is the fallback for records
// that omit it.
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
export function boroughFor(p: PhotonFeature["properties"]): string {
  for (const field of [p.district, p.city]) {
    const match = matchBorough(field);
    if (match) return match;
  }
  return COUNTY_TO_BOROUGH[(p.county || "").trim().toLowerCase()] || "";
}

// Photon returns the state as either a code or a full name ("NY" for one
// result, "New York" for the next), and the SFUSA form wants the code.
const STATE_CODES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI",
  minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC",
  "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "puerto rico": "PR", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

function stateCode(state?: string): string {
  if (!state) return "";
  const trimmed = state.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return STATE_CODES[trimmed.toLowerCase()] ?? trimmed;
}

function streetLine(p: PhotonFeature["properties"]): string {
  return [p.housenumber, p.street].filter(Boolean).join(" ");
}

export function resolveAddress(f: PhotonFeature): ResolvedAddress {
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  return {
    address: streetLine(p),
    city: p.city || "",
    state: stateCode(p.state),
    zip: p.postcode || "",
    borough: boroughFor(p),
    latitude: String(lat),
    longitude: String(lon),
  };
}

/**
 * Identity of a street address, ignoring the postcode: several POIs at one
 * address can disagree on the ZIP, and showing that twice looks like two
 * different places.
 */
export function addressKey(f: PhotonFeature): string {
  const a = resolveAddress(f);
  return [a.address, a.borough, a.city, a.state]
    .map((part) => part.trim().toLowerCase())
    .join("|");
}

/**
 * The suggestion text: street, borough, city, state ZIP. Built from the
 * structured fields so the business name and administrative clutter never
 * appear ("201 West 72nd Street, Manhattan, New York, NY 10023").
 */
export function formatSuggestion(f: PhotonFeature): string {
  const resolved = resolveAddress(f);
  // Photon reports a borough as both district and city ("Brooklyn, Brooklyn"),
  // so only show the city when it adds something.
  const city =
    resolved.city.toLowerCase() === resolved.borough.toLowerCase()
      ? ""
      : resolved.city;
  return [
    resolved.address,
    resolved.borough,
    city,
    [resolved.state, resolved.zip].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}
