import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { geocodeAddress } from "../lib/geocode.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const snails = await prisma.snail.findMany({
    where: { address: { not: null }, latitude: null },
    select: { id: true, name: true, address: true, borough: true, zip: true },
    orderBy: { name: "asc" },
  });

  console.log(`Found ${snails.length} snails to geocode\n`);

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < snails.length; i++) {
    const s = snails[i];
    const parts = [s.address];
    if (s.borough) parts.push(s.borough);
    parts.push("New York, NY");
    if (s.zip) parts.push(s.zip);
    const fullAddress = parts.join(", ");

    const coords = await geocodeAddress(fullAddress);

    if (coords) {
      await prisma.snail.update({
        where: { id: s.id },
        data: { latitude: coords.latitude, longitude: coords.longitude },
      });
      console.log(
        `[${i + 1}/${snails.length}] ✓ "${s.name}" → ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
      );
      succeeded++;
    } else {
      console.log(
        `[${i + 1}/${snails.length}] ✗ "${s.name}" — no results for: ${fullAddress}`
      );
      failed++;
    }

    // Nominatim rate limit: 1 req/sec
    if (i < snails.length - 1) {
      await sleep(1100);
    }
  }

  console.log(`\nDone: ${succeeded} geocoded, ${failed} failed`);
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
