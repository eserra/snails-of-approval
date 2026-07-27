// Builds a prefilled Google Form URL for submitting a snail to Slow Food USA.
//
// The `entry.<id>` parameter IDs and the exact option strings below were extracted
// from the live form's FB_PUBLIC_LOAD_DATA_ payload:
//   https://docs.google.com/forms/d/e/1FAIpQLSfkzv4Zs-97Kky3ZP57pwiZVXC5yfAgjGc0otVejzMNdaSzBg/viewform
// If SFUSA edits the form (reorders/renames fields), these IDs/strings must be re-extracted.

export const SFUSA_FORM_ID =
  "1FAIpQLSfkzv4Zs-97Kky3ZP57pwiZVXC5yfAgjGc0otVejzMNdaSzBg";
export const SFUSA_FORM_VIEW_URL = `https://docs.google.com/forms/d/e/${SFUSA_FORM_ID}/viewform`;

export const SFUSA_ENTRY = {
  chapter: "354535174",
  name: "1116878094",
  businessTypes: "1916856598", // checkboxes (repeatable)
  ownership: "226828341", // checkboxes (repeatable)
  website: "331818516",
  facebook: "2079421521",
  instagram: "1901921136",
  otherSocial: "1689670370",
  phone: "1631177423",
  phoneVanity: "120070994",
  email: "1667009616",
  streetAddress: "2132720602",
  city: "1861163195",
  state: "1524382522", // dropdown of 2-letter codes
  postalCode: "988656049",
  latitude: "2047047084",
  longitude: "1584740661",
  description: "1483894072",
} as const;

// Our chapter name -> exact SFUSA dropdown option.
export const CHAPTER_TO_SFUSA: Record<string, string> = {
  "NY - New York": "NY - New York City",
};

// Our diversity-tag slug (lib/diversity-tags) -> exact SFUSA ownership option.
export const DIVERSITY_TO_SFUSA: Record<string, string> = {
  bipoc: "Black, Indigenous and People of Color (BIPOC)",
  lgbtqia2s: "LGBTQ2+",
  "person-with-disability": "People with one or more disabilities",
  veteran: "Veterans",
  woman: "Women",
};

// The four valid "Type of Business" options (must match the form exactly). These are
// also our four top-level category names.
export const SFUSA_BUSINESS_TYPES = [
  "Agricultural",
  "Maker",
  "Food Service",
  "Supporting Organization",
];

export type SfusaPrefillInput = {
  chapterName?: string | null;
  name?: string | null;
  businessTypes?: string[]; // top-level category names
  ownershipSlugs?: string[]; // diversity-tag slugs
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  otherSocial?: string | null;
  phone?: string | null;
  phoneVanity?: string | null;
  email?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  description?: string | null;
};

export function buildSfusaPrefillUrl(input: SfusaPrefillInput): string {
  const params = new URLSearchParams();
  params.set("usp", "pp_url");

  const add = (entry: string, value?: string | null) => {
    const v = value == null ? "" : String(value).trim();
    if (v !== "") params.append(`entry.${entry}`, v);
  };

  add(
    SFUSA_ENTRY.chapter,
    input.chapterName
      ? CHAPTER_TO_SFUSA[input.chapterName] || input.chapterName
      : null
  );
  add(SFUSA_ENTRY.name, input.name);

  // Checkboxes: repeat the same entry key once per selected value.
  for (const type of input.businessTypes || []) {
    if (SFUSA_BUSINESS_TYPES.includes(type)) {
      params.append(`entry.${SFUSA_ENTRY.businessTypes}`, type);
    }
  }
  for (const slug of input.ownershipSlugs || []) {
    const label = DIVERSITY_TO_SFUSA[slug];
    if (label) params.append(`entry.${SFUSA_ENTRY.ownership}`, label);
  }

  add(SFUSA_ENTRY.website, input.website);
  add(SFUSA_ENTRY.facebook, input.facebook);
  add(SFUSA_ENTRY.instagram, input.instagram);
  add(SFUSA_ENTRY.otherSocial, input.otherSocial);
  add(SFUSA_ENTRY.phone, input.phone);
  add(SFUSA_ENTRY.phoneVanity, input.phoneVanity);
  add(SFUSA_ENTRY.email, input.email);
  add(SFUSA_ENTRY.streetAddress, input.streetAddress);
  add(SFUSA_ENTRY.city, input.city);
  add(SFUSA_ENTRY.state, input.state);
  add(SFUSA_ENTRY.postalCode, input.postalCode);
  add(SFUSA_ENTRY.latitude, input.latitude);
  add(SFUSA_ENTRY.longitude, input.longitude);
  add(SFUSA_ENTRY.description, input.description);

  return `${SFUSA_FORM_VIEW_URL}?${params.toString()}`;
}
