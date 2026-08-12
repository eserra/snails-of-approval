import { getAudienceId, mailchimpFetch } from "./client";

// The audience's shape: the merge fields we write per contact, and the
// auto-updating segments ("saved" segments) that turn those fields into the
// sendable views the team asked for — Leads, Active, and so on. Because the
// segments key off merge fields, a snail moving lead -> active in the CRM moves
// its contacts between segments on the next sync, with no per-audience shuffling.

// Merge field tags are uppercase and capped at 10 characters by Mailchimp.
type MergeType = "text" | "number";
type MergeFieldDef = { tag: string; name: string; type: MergeType };

export const MERGE_FIELDS: MergeFieldDef[] = [
  { tag: "SNAIL", name: "Snail (business)", type: "text" },
  { tag: "ROLE", name: "Contact role", type: "text" },
  { tag: "CHAPTER", name: "Chapter", type: "text" },
  { tag: "TRACK", name: "Pipeline track", type: "text" },
  { tag: "STAGE", name: "Pipeline stage", type: "text" },
  { tag: "BIZSTATUS", name: "Business status", type: "text" },
  { tag: "CATEGORY", name: "Category", type: "text" },
  // Tag stays YEARAWARD: it's the external key ensureSchema matches on, and
  // renaming it would orphan the audience's existing field and its segments.
  { tag: "YEARAWARD", name: "Year first awarded", type: "number" },
];

// A saved segment defined by conditions over merge fields. `match: "all"` ANDs
// the conditions. Add rows here to grow the set — ensureSchema creates any that
// don't exist yet, keyed by name.
type SegmentDef = {
  name: string;
  conditions: { field: string; op: "is"; value: string }[];
};

export const SEGMENT_DEFS: SegmentDef[] = [
  { name: "Leads", conditions: [{ field: "TRACK", op: "is", value: "lead" }] },
  { name: "Active", conditions: [{ field: "TRACK", op: "is", value: "active" }] },
  {
    name: "Renewal Due",
    conditions: [{ field: "STAGE", op: "is", value: "renewal_due" }],
  },
  {
    name: "Lapsed",
    conditions: [{ field: "STAGE", op: "is", value: "lapsed" }],
  },
  {
    name: "Open businesses",
    conditions: [{ field: "BIZSTATUS", op: "is", value: "active" }],
  },
];

type EnsureResult = { mergeFieldsCreated: string[]; segmentsCreated: string[] };

/**
 * Idempotently bring the audience up to the shape above: create any missing
 * merge fields and segments, leave existing ones untouched (so manual tweaks in
 * the Mailchimp UI survive). Safe to run before every sync.
 */
export async function ensureSchema(): Promise<EnsureResult> {
  const listId = getAudienceId();
  const result: EnsureResult = { mergeFieldsCreated: [], segmentsCreated: [] };

  // Merge fields — match on tag.
  const existingFields = await mailchimpFetch<{
    merge_fields: { tag: string }[];
  }>(`/lists/${listId}/merge-fields?count=1000`);
  const haveTags = new Set(existingFields.merge_fields.map((f) => f.tag));

  for (const field of MERGE_FIELDS) {
    if (haveTags.has(field.tag)) continue;
    await mailchimpFetch(`/lists/${listId}/merge-fields`, {
      method: "POST",
      body: {
        tag: field.tag,
        name: field.name,
        type: field.type,
        required: false,
        public: false, // internal data, not shown on signup forms
      },
    });
    result.mergeFieldsCreated.push(field.tag);
  }

  // Saved segments — match on name.
  const existingSegments = await mailchimpFetch<{
    segments: { name: string }[];
  }>(`/lists/${listId}/segments?type=saved&count=1000`);
  const haveNames = new Set(existingSegments.segments.map((s) => s.name));

  for (const def of SEGMENT_DEFS) {
    if (haveNames.has(def.name)) continue;
    await mailchimpFetch(`/lists/${listId}/segments`, {
      method: "POST",
      body: {
        name: def.name,
        options: {
          match: "all",
          conditions: def.conditions.map((c) => ({
            condition_type: "TextMerge",
            op: c.op,
            field: c.field,
            value: c.value,
          })),
        },
      },
    });
    result.segmentsCreated.push(def.name);
  }

  return result;
}
