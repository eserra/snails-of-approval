import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as XLSX from "xlsx";
import { slugify } from "../lib/slug.js";
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

    let stage: string | null = null;
    if (rawPipelineStage === "Active" || rawPipelineStage === "Awarded") stage = "Active";
    else if (rawPipelineStage === "1 - Contacted") stage = "Contacted";
    else if (rawPipelineStage === "Former") stage = "Lapsed";
    else if (rawPipelineStage) stage = rawPipelineStage;

    // Fill in defaults
    if (!stage && formerAwardee) stage = "Lapsed";
    if (!stage && track === "lead") stage = "New";
    if (!stage && track === "active") stage = "Active";
    const businessStatus = str(row["Business Status"]);
    const source = str(row["Source"]);
    const establishmentType = str(row["Establishment Type (SFNYC)"]);
    const borough = str(row["Borough"]);
    const contactName = str(row["Contact Name"]);
    const email = str(row["Contact Email"]);
    const website = str(row["Website"]);
    const instagramUrl = str(row["Instagram"]);
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
    const yearAwarded = parseIntOrNull(row["Latest SOA Award Year"]);
    const renewalDueYear = parseIntOrNull(row["Renewal Due Year"]);
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
      yearAwarded,
      description,
      address,
      email,
      website,
      instagramUrl,
      status,
      track,
      stage,
      formerAwardee,
      renewalDueYear,
      businessStatus,
      source,
      blockedReason,
      contactName,
      borough,
      zip,
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
