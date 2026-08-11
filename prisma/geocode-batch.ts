import { prisma } from "./script-client.js";
import { geocodeAddress } from "../lib/geocode.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const locations = await prisma.location.findMany({
    where: { address: { not: null }, latitude: null },
    select: {
      id: true,
      address: true,
      borough: true,
      zip: true,
      snail: { select: { name: true } },
    },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${locations.length} locations to geocode\n`);

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < locations.length; i++) {
    const l = locations[i];
    const parts = [l.address];
    if (l.borough) parts.push(l.borough);
    parts.push("New York, NY");
    if (l.zip) parts.push(l.zip);
    const fullAddress = parts.join(", ");

    const coords = await geocodeAddress(fullAddress);

    if (coords) {
      await prisma.location.update({
        where: { id: l.id },
        data: { latitude: coords.latitude, longitude: coords.longitude },
      });
      console.log(
        `[${i + 1}/${locations.length}] ✓ "${l.snail.name}" → ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
      );
      succeeded++;
    } else {
      console.log(
        `[${i + 1}/${locations.length}] ✗ "${l.snail.name}" — no results for: ${fullAddress}`
      );
      failed++;
    }

    // Nominatim rate limit: 1 req/sec
    if (i < locations.length - 1) {
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
