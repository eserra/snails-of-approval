// Reads the live Slow Food USA "Snail of Approval Map" and matches its awardees to our
// snails, so we can tell which of ours are already published on the national map.
//
// The map is an ArcGIS Web Experience (item 60862769…) backed by a Survey123 feature
// layer. This is the public FeatureServer behind it. If SFUSA rebuilds the map, re-derive
// the URL: item 60862769…/data -> web map f7fcca…/data -> operationalLayers[].url
import { CHAPTER_TO_SFUSA } from "./sfusa-form";

const FEATURE_LAYER_URL =
  "https://services1.arcgis.com/KDVpB2gNVh77gKQu/arcgis/rest/services/survey123_e45a7ded034a4ead9545da11cc75edbf/FeatureServer/0";

// ArcGIS truncates field names to 31 chars — this is the full-address field.
const ADDRESS_FIELD = "what_is_the_full_address_for_th";

export type SfusaAwardee = {
  name: string;
  address: string | null;
  zip: string | null;
  year: string | null;
};

// Normalize a business name for fuzzy matching: lowercase, drop punctuation, and
// ignore a leading/trailing "the" ("The Brooklyn Kitchen" == "Brooklyn Kitchen, the").
export function normalizeAwardeeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the\s+/, "")
    .replace(/\s+the$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractZip(address: string | null | undefined): string | null {
  if (!address) return null;
  const m = address.match(/\b(\d{5})\b/);
  return m ? m[1] : null;
}

// Our chapter name -> the chapter label used on the SFUSA map (reuses the form mapping).
export function toSfusaChapter(chapterName: string): string {
  return CHAPTER_TO_SFUSA[chapterName] || chapterName;
}

// Fetch all awardees for one chapter from the live map.
export async function fetchSfusaAwardees(
  sfusaChapterName: string
): Promise<SfusaAwardee[]> {
  const params = new URLSearchParams({
    where: `chapter_name='${sfusaChapterName.replace(/'/g, "''")}'`,
    outFields: `awardee_name,${ADDRESS_FIELD},year_awarded`,
    returnGeometry: "false",
    resultRecordCount: "2000",
    f: "json",
  });
  const res = await fetch(`${FEATURE_LAYER_URL}/query?${params.toString()}`);
  if (!res.ok) throw new Error(`SFUSA map query failed: HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) {
    throw new Error(`SFUSA map query error: ${JSON.stringify(data.error)}`);
  }
  return (data.features || []).map(
    (f: { attributes: Record<string, string> }) => {
      const a = f.attributes;
      const address = a[ADDRESS_FIELD] || null;
      return {
        name: a.awardee_name || "",
        address,
        zip: extractZip(address),
        year: a.year_awarded || null,
      };
    }
  );
}

export type AwardeeIndex = Map<string, SfusaAwardee[]>;

export function buildAwardeeIndex(awardees: SfusaAwardee[]): AwardeeIndex {
  const index: AwardeeIndex = new Map();
  for (const a of awardees) {
    const key = normalizeAwardeeName(a.name);
    if (!key) continue;
    const list = index.get(key) || [];
    list.push(a);
    index.set(key, list);
  }
  return index;
}

// Is this snail on the SFUSA map? Match on normalized name; when both sides have a ZIP,
// require it to agree (guards against same-name, different-location awardees).
export function matchOnMap(
  snail: { name: string; zip: string | null },
  index: AwardeeIndex
): SfusaAwardee | null {
  const matches = index.get(normalizeAwardeeName(snail.name));
  if (!matches || matches.length === 0) return null;
  if (!snail.zip) return matches[0];
  const withZip = matches.filter((m) => m.zip);
  if (withZip.length === 0) return matches[0]; // map has no ZIP to compare against
  return withZip.find((m) => m.zip === snail.zip) ?? null;
}
