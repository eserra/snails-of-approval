import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as XLSX from "xlsx";
import { slugify } from "../lib/slug.js";
import { stages } from "../lib/pipeline-stages.js";
import { normalizeInstagramHandle } from "../lib/instagram.js";
import path from "path";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// Map spreadsheet assignee first names to user emails
const assigneeMap: Record<string, string> = {
  barbara: "barbara@snailsofapproval.org",
  "kyle k": "kyle.karnuta@snailsofapproval.org",
  "kyle karnuta": "kyle.karnuta@snailsofapproval.org",
  "laura h": "laura.hoffman@snailsofapproval.org",
  "laura hoffman": "laura.hoffman@snailsofapproval.org",
  matt: "matt@snailsofapproval.org",
  "karen g": "karen.guzman@snailsofapproval.org",
  "karen guzman": "karen.guzman@snailsofapproval.org",
  "edlin choi": "edlin.choi@snailsofapproval.org",
  "charlie marshall": "charlie.marshall@snailsofapproval.org",
  richa: "richa@snailsofapproval.org",
};

async function main() {
  const filePath =
    process.argv[2] ||
    path.join(__dirname, "../data/SoA NYC Main List.xlsx");

  console.log(`Reading: ${filePath}`);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  console.log(`Found ${rows.length} rows`);

  // Look up NY chapter
  const nyChapter = await prisma.chapter.findUnique({
    where: { slug: "ny-new-york" },
  });
  if (!nyChapter) {
    throw new Error("NY chapter not found — run seed first");
  }

  // Load all users for assignee lookup
  const allUsers = await prisma.user.findMany();
  const userByEmail = new Map(allUsers.map((u) => [u.email, u]));

  // Load categories for SFUSA sub-type mapping
  const allCategories = await prisma.category.findMany();
  const categoryByName = new Map(
    allCategories.map((c) => [c.name.toLowerCase(), c])
  );

  // Admin user for note authorship
  const adminUser = allUsers.find((u) => u.role === "admin")!;

  let imported = 0;
  let skipped = 0;
  const issues: string[] = [];

  for (const row of rows) {
    const name = String(row["Establishment Name"] || "").trim();
    if (!name) {
      skipped++;
      continue;
    }

    let slug = slugify(name);
    if (!slug) {
      issues.push(`Empty slug for: ${name}`);
      skipped++;
      continue;
    }

    // Parse fields
    const rawAwardStatus = str(row["Category"]);
    const rawPipelineStage = str(row["Stage / Status"]);
    const onSfusaMap = String(row["On SFUSA Map"] || "").toLowerCase() === "yes";

    // Map to track/stage/formerAwardee
    const formerAwardee = rawAwardStatus?.includes("Former") || false;
    let track = "lead";
    if (rawAwardStatus?.includes("Active Awardee")) track = "active";

    // Spreadsheet labels → machine-readable Snail.stage values (lib/pipeline-stages)
    let stage: string | null = null;
    if (rawPipelineStage === "Active" || rawPipelineStage === "Awarded") stage = "active";
    else if (rawPipelineStage === "1 - Contacted") stage = "contacted";
    else if (rawPipelineStage === "Former") stage = "lapsed";
    else if (rawPipelineStage) {
      const match = stages.find(
        (s) => s.label.toLowerCase() === rawPipelineStage.toLowerCase()
      );
      stage = match ? match.value : rawPipelineStage;
    }

    // Fill in defaults
    if (!stage && formerAwardee) stage = "lapsed";
    if (!stage && track === "lead") stage = "new";
    if (!stage && track === "active") stage = "active";
    // Spreadsheet labels → machine-readable Snail.businessStatus values
    const rawBusinessStatus = str(row["Business Status"]);
    const businessStatus =
      rawBusinessStatus === "Confirmed - In Business" ? "active"
      : rawBusinessStatus === "Permanently Closed" ? "permanently_closed"
      : rawBusinessStatus === "TBC" ? "to_be_confirmed"
      : rawBusinessStatus;
    const source = str(row["Source"]);
    const establishmentType = str(row["Establishment Type (SFNYC)"]);
    const borough = str(row["Borough"]);
    const contactName = str(row["Contact Name"]);
    const email = str(row["Contact Email"]);
    const website = str(row["Website"]);
    const instagramRaw = str(row["Instagram"]);
    const instagramHandle = instagramRaw
      ? normalizeInstagramHandle(instagramRaw)
      : null;
    const sfusaSubtype = str(row["SFUSA Sub-type"]);
    const description = str(row["Blurb"]);
    const rawDiversity = str(row["Diversity / Ownership"]);
    const labelToSlug: Record<string, string> = {
      woman: "woman",
      bipoc: "bipoc",
      "lgbtqia2s+": "lgbtqia2s",
      "person with disability": "person-with-disability",
      veteran: "veteran",
    };
    const diversityTags = rawDiversity
      ? JSON.stringify(
          rawDiversity
            .split(",")
            .map((t) => labelToSlug[t.trim().toLowerCase()] || t.trim().toLowerCase())
            .filter(Boolean)
        )
      : null;
    const blockedReason = str(row["Blocked / Rejected Reason"]);
    const notes = str(row["Notes"]);
    const address = str(row["Street Address"]);

    // Parse numeric fields
    //
    // CAVEAT: the sheet has no first-award column — only "Latest SOA Award
    // Year" — so this is a proxy for yearFirstAwarded and is wrong for any
    // snail that has been renewed since it was first awarded. It's kept as the
    // best available value; where the true first year isn't known, leaving
    // yearFirstAwarded null is the honest answer.
    const latestAwardYear = parseIntOrNull(row["Latest SOA Award Year"]);
    const zip = str(row["ZIP"])?.replace(/\.0$/, "") || null;

    // Parse date
    const lastTouchDate = parseDate(row["Last Touch"]);

    // Parse booleans (currently all empty in spreadsheet)
    const welcomeLetterSent = Boolean(row["Welcome Letter Sent"]);
    const stickersDelivered = Boolean(row["SOA Stickers Delivered"]);

    // Determine published status
    const status = track === "active" ? "published" : "draft";

    // Look up assignee
    const assigneeName = String(row["Assignee"] || "")
      .trim()
      .toLowerCase();
    const assigneeEmail = assigneeMap[assigneeName];
    const assignee = assigneeEmail ? userByEmail.get(assigneeEmail) : null;
    if (assigneeName && !assignee) {
      issues.push(`Unknown assignee "${row["Assignee"]}" for: ${name}`);
    }

    // Look up category by SFUSA sub-type
    const catLookup = sfusaSubtype?.toLowerCase() || null;
    const category = catLookup ? categoryByName.get(catLookup) : null;

    // Upsert snail
    const data = {
      name,
      yearFirstAwarded: latestAwardYear,
      description,
      website,
      instagramHandle,
      status,
      track,
      stage,
      formerAwardee,
      businessStatus,
      source,
      blockedReason,
      onSfusaMap,
      establishmentType,
      assigneeId: assignee?.id || null,
      lastTouchDate,
      welcomeLetterSent,
      stickersDelivered,
      diversityTags,
      categoryId: category?.id || null,
      chapterId: nyChapter.id,
    };

    // Check if slug already exists to make it unique
    const existing = await prisma.snail.findUnique({ where: { slug } });
    if (existing && existing.name !== name) {
      slug = `${slug}-${Date.now()}`;
    }

    await prisma.snail.upsert({
      where: { slug },
      update: data,
      create: { slug, ...data },
    });

    // Fold the spreadsheet's single address into the snail's main location.
    // Re-run safe: only create if this snail has no location yet.
    if (address || borough || zip) {
      const snail = await prisma.snail.findUnique({ where: { slug } });
      if (snail) {
        const existingLocation = await prisma.location.findFirst({
          where: { snailId: snail.id },
        });
        if (!existingLocation) {
          await prisma.location.create({
            data: {
              kind: "storefront",
              address,
              borough,
              zip,
              isPublic: true,
              isPrimary: true,
              snailId: snail.id,
            },
          });
        }
      }
    }

    // Fold the spreadsheet's single contact into a contact row.
    //
    // Re-run safe by identity, not by role: the sheet doesn't say whether this
    // person is an owner or a chef, so the row is created with no roles for a
    // human to fill in — which means "has no roles yet" can't be the dedupe key
    // (it would match every unfilled contact). Match on email where there is
    // one, else on name.
    if (contactName || email) {
      const snail = await prisma.snail.findUnique({ where: { slug } });
      if (snail) {
        const existingContact = await prisma.contact.findFirst({
          where: email
            ? { snailId: snail.id, email }
            : { snailId: snail.id, name: contactName || name },
        });
        if (!existingContact) {
          await prisma.contact.create({
            data: {
              name: contactName || name,
              roles: [],
              email,
              isPublic: true,
              isPrimary: true,
              snailId: snail.id,
            },
          });
        }
      }
    }

    // Create a note if the Notes column has content
    if (notes) {
      const snail = await prisma.snail.findUnique({ where: { slug } });
      if (snail) {
        // Only create note if one doesn't already exist with this content
        const existingNote = await prisma.note.findFirst({
          where: { snailId: snail.id, content: notes },
        });
        if (!existingNote) {
          await prisma.note.create({
            data: {
              content: notes,
              snailId: snail.id,
              authorId: adminUser.id,
            },
          });
        }
      }
    }

    imported++;
  }

  console.log(`\nImported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  if (issues.length > 0) {
    console.log(`\nIssues (${issues.length}):`);
    issues.forEach((i) => console.log(`  - ${i}`));
  }
}

function str(val: unknown): string | null {
  if (val === undefined || val === null || val === "") return null;
  const s = String(val).trim();
  return s || null;
}

function parseIntOrNull(val: unknown): number | null {
  if (val === undefined || val === null || val === "") return null;
  const s = String(val).replace(/\.0$/, "");
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function parseDate(val: unknown): Date | null {
  if (val === undefined || val === null || val === "") return null;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
