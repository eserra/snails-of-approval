import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// SFNYC legacy type → SFUSA category ID mapping
const mapping: Record<string, number> = {
  // Exact matches
  "Restaurant": 1,
  "Bar": 8,
  "Bakery": 33,
  "Brewery": 9,
  // Close matches
  "Wine Bar": 8,
  "Wine Shop": 30,
  "drinking establishment": 8,
  "Catering / Events": 10,
  "Mobile Pizza Restaurant": 35,
  "Restaurant Group": 1,
  // Approximate matches
  "Purveyor": 43,
  "Retail Store": 43,
  "Retail Store / Distributor": 43,
  "Distributor": 42,
  "CSA Box": 42,
  "Wine / Spirits / Beer Producer": 30,
  "Wine/Spirits/Beer Producer": 30,
  "Spirits": 28,
  "Farm / Orchard / Livestock": 19,
  "Urban Farm / Garden": 19,
  "Butcher": 29,
  // Fallbacks
  "Maker": 31,
  "CPG": 31,
  "Tortilla Supplier": 31,
  "Hospital": 40,
  // Skip
  // "Other": too ambiguous
};

async function main() {
  const before = await prisma.snail.count({
    where: { establishmentType: { not: null }, categoryId: null },
  });
  console.log(`Snails with legacy type but no SFUSA category: ${before}`);

  let mapped = 0;
  let skipped = 0;

  for (const [legacyType, categoryId] of Object.entries(mapping)) {
    const result = await prisma.snail.updateMany({
      where: {
        establishmentType: legacyType,
        categoryId: null,
      },
      data: { categoryId },
    });
    if (result.count > 0) {
      const cat = await prisma.category.findUnique({
        where: { id: categoryId },
        include: { parent: { select: { name: true } } },
      });
      console.log(
        `  ${result.count}x  "${legacyType}" → ${cat?.parent?.name} > ${cat?.name}`
      );
      mapped += result.count;
    }
  }

  // Count remaining unmapped
  const remaining = await prisma.snail.findMany({
    where: { establishmentType: { not: null }, categoryId: null },
    select: { name: true, establishmentType: true },
  });

  console.log(`\nMapped: ${mapped}`);
  console.log(`Skipped (needs manual review): ${remaining.length}`);
  remaining.forEach((s) =>
    console.log(`  "${s.name}" — legacy type: "${s.establishmentType}"`)
  );
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
