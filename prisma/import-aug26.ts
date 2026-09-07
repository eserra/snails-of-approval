import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";

/**
 * Imports Laura's August 2026 roster (data/aug26-import.json) into the NY chapter.
 *
 * The source sheet carries only names and emails; addresses, coordinates and
 * categories were researched separately and each row records where its address
 * came from (see `sourceNote`) and how much to trust it (`confidence`).
 *
 * Non-destructive by design. The online DB already holds a handful of these
 * snails, hand-entered with better data than this file has — Little Egg's 2009
 * first-award year, Kafana's "116 Loisaida Ave" — so an existing row only ever
 * has its *empty* fields filled in. Nothing hand-entered is overwritten, which
 * also makes the script safe to re-run.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type Entry = {
  slug: string; name: string; sheetName: string; sheetRow: number;
  track: string; stage: string; status: string; businessStatus: string;
  yearFirstAwarded: number | null; categorySlug: string;
  confidence: string; sourceNote: string;
  location: {
    address: string | null; borough: string | null; city: string;
    state: string; zip: string | null;
    latitude: number | null; longitude: number | null;
  } | null;
  contacts: { name: string; email: string }[];
  notes: string[];
};

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const file = path.join(__dirname, "../data/aug26-import.json");
  const entries: Entry[] = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`${DRY_RUN ? "[DRY RUN] " : ""}Importing ${entries.length} snails from ${path.basename(file)}\n`);

  const chapter = await prisma.chapter.findUnique({ where: { slug: "ny-new-york" } });
  if (!chapter) throw new Error("NY chapter not found — run the seed first");

  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const admin = await prisma.user.findFirst({ where: { role: "admin" }, orderBy: { id: "asc" } });
  if (!admin) throw new Error("No admin user found — notes need an author");

  let created = 0, filled = 0, unchanged = 0, contactsAdded = 0, locationsAdded = 0, notesAdded = 0;
  const warnings: string[] = [];

  for (const e of entries) {
    const category = categoryBySlug.get(e.categorySlug);
    if (!category) warnings.push(`Unknown category "${e.categorySlug}" for ${e.name}`);

    const existing = await prisma.snail.findUnique({
      where: { slug: e.slug },
      include: { locations: true, contacts: true, notes: true },
    });

    if (!existing) {
      console.log(`  + ${e.name}  [${e.confidence}]`);
      created++;
      if (!DRY_RUN) {
        const snail = await prisma.snail.create({
          data: {
            slug: e.slug, name: e.name,
            yearFirstAwarded: e.yearFirstAwarded,
            status: e.status, track: e.track, stage: e.stage,
            businessStatus: e.businessStatus,
            source: "Laura's Aug 2026 list",
            categoryId: category?.id ?? null,
            chapterId: chapter.id,
          },
        });
        if (e.location) {
          await prisma.location.create({
            data: { ...e.location, kind: "storefront", isPublic: true, isPrimary: true, snailId: snail.id },
          });
          locationsAdded++;
        }
        for (const [i, c] of e.contacts.entries()) {
          await prisma.contact.create({
            data: {
              name: c.name || e.name, roles: [], email: c.email,
              isPublic: true, isPrimary: i === 0, snailId: snail.id,
            },
          });
          contactsAdded++;
        }
        for (const content of e.notes) {
          await prisma.note.create({ data: { content, snailId: snail.id, authorId: admin.id } });
          notesAdded++;
        }
      }
      continue;
    }

    // Already present — fill only what is missing, and say what was filled.
    const patch: Record<string, unknown> = {};
    if (existing.yearFirstAwarded === null && e.yearFirstAwarded !== null) patch.yearFirstAwarded = e.yearFirstAwarded;
    if (existing.categoryId === null && category) patch.categoryId = category.id;
    if (existing.businessStatus === null) patch.businessStatus = e.businessStatus;
    if (existing.source === null) patch.source = "Laura's Aug 2026 list";
    if (existing.stage === null) patch.stage = e.stage;

    const changes: string[] = Object.keys(patch);
    if (!DRY_RUN && changes.length) await prisma.snail.update({ where: { id: existing.id }, data: patch });

    if (existing.locations.length === 0 && e.location) {
      changes.push("location");
      if (!DRY_RUN) {
        await prisma.location.create({
          data: { ...e.location, kind: "storefront", isPublic: true, isPrimary: true, snailId: existing.id },
        });
      }
      locationsAdded++;
    }

    const seenEmails = new Set(existing.contacts.map((c) => c.email?.toLowerCase()).filter(Boolean));
    for (const c of e.contacts) {
      if (seenEmails.has(c.email.toLowerCase())) continue;
      changes.push(`contact ${c.email}`);
      if (!DRY_RUN) {
        await prisma.contact.create({
          data: {
            name: c.name || e.name, roles: [], email: c.email,
            isPublic: true, isPrimary: existing.contacts.length === 0,
            snailId: existing.id,
          },
        });
      }
      contactsAdded++;
    }

    const seenNotes = new Set(existing.notes.map((n) => n.content));
    for (const content of e.notes) {
      if (seenNotes.has(content)) continue;
      changes.push("note");
      if (!DRY_RUN) await prisma.note.create({ data: { content, snailId: existing.id, authorId: admin.id } });
      notesAdded++;
    }

    if (changes.length) {
      console.log(`  ~ ${e.name}  filled: ${changes.join(", ")}`);
      filled++;
    } else {
      console.log(`  = ${e.name}  (already complete)`);
      unchanged++;
    }
  }

  console.log(`\n${DRY_RUN ? "[DRY RUN] would create" : "Created"} ${created} snails, ` +
              `${filled} existing filled in, ${unchanged} untouched`);
  console.log(`Locations: ${locationsAdded}   Contacts: ${contactsAdded}   Notes: ${notesAdded}`);

  const low = entries.filter((e) => e.confidence !== "high");
  console.log(`\n${low.length} rows need a human to check the address (see data/aug26-review.csv):`);
  for (const e of low) console.log(`  [${e.confidence}] ${e.name} — ${e.sourceNote}`);
  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
