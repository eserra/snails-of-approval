// Builds the CRM spreadsheet export for the admin Snails page. The Prisma query
// and the XLSX writing live in the API route (app/api/admin/export/route.ts);
// this module is the pure, testable middle: given fully-loaded snails, produce
// the header row and one row of human-readable cells per snail.
import { Prisma } from "@/app/generated/prisma/client";
import { stageLabel } from "@/lib/pipeline-stages";
import { businessStatusLabel } from "@/lib/business-status";
import { contactRoleLabel } from "@/lib/contact-roles";
import { getDiversityLabel, parseDiversityTags } from "@/lib/diversity-tags";

// Everything the export needs, in one Prisma include so the query and the row
// builder can never drift apart.
export const snailExportInclude = {
  chapter: { select: { name: true } },
  category: { select: { name: true, parent: { select: { name: true } } } },
  assignee: { select: { name: true } },
  contacts: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  locations: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.SnailInclude;

export type ExportSnail = Prisma.SnailGetPayload<{
  include: typeof snailExportInclude;
}>;

type Cell = string | number;

// A snail can hold several contacts/locations; exactly one is flagged primary
// (falling back to the oldest, which the include's ordering puts first). The
// spreadsheet is one row per snail, so we surface that primary one.
function primary<T extends { isPrimary: boolean }>(rows: T[]): T | undefined {
  return rows.find((r) => r.isPrimary) ?? rows[0];
}

const yesNo = (v: boolean): string => (v ? "Yes" : "No");

// Date only — the spreadsheet is read by people, not machines, and the time of
// day carries no meaning for these fields.
function date(v: Date | null): string {
  return v ? v.toISOString().slice(0, 10) : "";
}

function decimal(v: Prisma.Decimal | null): Cell {
  return v === null ? "" : Number(v);
}

function categoryLabel(snail: ExportSnail): string {
  if (!snail.category) return "";
  const { name, parent } = snail.category;
  return parent ? `${parent.name} › ${name}` : name;
}

// Column order is the export contract — identity first, then the CRM funnel,
// the board decision, fulfilment flags, the primary contact and location, and
// finally the record timestamps.
const columns: { header: string; get: (s: ExportSnail) => Cell }[] = [
  { header: "Name", get: (s) => s.name },
  { header: "Slug", get: (s) => s.slug },
  { header: "Status", get: (s) => s.status },
  { header: "Year Awarded", get: (s) => s.yearAwarded ?? "" },
  { header: "Chapter", get: (s) => s.chapter.name },
  { header: "Category", get: categoryLabel },
  { header: "Website", get: (s) => s.website ?? "" },

  { header: "Track", get: (s) => s.track },
  { header: "Stage", get: (s) => stageLabel(s.stage) },
  { header: "Former Awardee", get: (s) => yesNo(s.formerAwardee) },
  { header: "Renewal Due Year", get: (s) => s.renewalDueYear ?? "" },
  { header: "Business Status", get: (s) => businessStatusLabel(s.businessStatus) },
  { header: "Source", get: (s) => s.source ?? "" },
  { header: "Blocked Reason", get: (s) => s.blockedReason ?? "" },
  { header: "Assignee", get: (s) => s.assignee?.name ?? "" },
  { header: "Last Touch", get: (s) => date(s.lastTouchDate) },
  { header: "On SFUSA Map", get: (s) => yesNo(s.onSfusaMap) },
  {
    header: "Diversity Tags",
    get: (s) => parseDiversityTags(s.diversityTags).map(getDiversityLabel).join(", "),
  },

  { header: "Recommendation", get: (s) => s.recommendation ?? "" },
  { header: "Board Decision", get: (s) => s.boardDecision ?? "" },
  { header: "Board Decision Date", get: (s) => date(s.boardDecisionDate) },

  { header: "Welcome Letter Sent", get: (s) => yesNo(s.welcomeLetterSent) },
  { header: "Stickers Delivered", get: (s) => yesNo(s.stickersDelivered) },
  { header: "Digital Assets Sent", get: (s) => yesNo(s.digitalAssetsSent) },
  { header: "Certificate Sent", get: (s) => yesNo(s.certificateSent) },
  { header: "Certificate Requested", get: (s) => date(s.certificateRequestedDate) },
  { header: "Press Release Sent", get: (s) => yesNo(s.pressReleaseSent) },
  { header: "Social Announced", get: (s) => yesNo(s.socialAnnounced) },

  { header: "Contact Name", get: (s) => primary(s.contacts)?.name ?? "" },
  {
    header: "Contact Role",
    get: (s) => {
      const c = primary(s.contacts);
      return c ? contactRoleLabel(c.role) : "";
    },
  },
  { header: "Contact Email", get: (s) => primary(s.contacts)?.email ?? "" },
  { header: "Contact Phone", get: (s) => primary(s.contacts)?.phone ?? "" },

  { header: "Address", get: (s) => primary(s.locations)?.address ?? "" },
  { header: "City", get: (s) => primary(s.locations)?.city ?? "" },
  { header: "State", get: (s) => primary(s.locations)?.state ?? "" },
  { header: "Borough", get: (s) => primary(s.locations)?.borough ?? "" },
  { header: "Zip", get: (s) => primary(s.locations)?.zip ?? "" },
  { header: "Latitude", get: (s) => decimal(primary(s.locations)?.latitude ?? null) },
  { header: "Longitude", get: (s) => decimal(primary(s.locations)?.longitude ?? null) },

  { header: "Created", get: (s) => date(s.createdAt) },
  { header: "Updated", get: (s) => date(s.updatedAt) },
];

/** Header row plus one row per snail, as an array-of-arrays for SheetJS. */
export function buildSnailSheet(snails: ExportSnail[]): Cell[][] {
  const header = columns.map((c) => c.header);
  const rows = snails.map((s) => columns.map((c) => c.get(s)));
  return [header, ...rows];
}
