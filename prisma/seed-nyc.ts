import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const nycSnails = [
  {
    slug: "di-fara-pizza",
    name: "Di Fara Pizza",
    yearAwarded: 2024,
    description:
      "A Brooklyn institution since 1965. Dom DeMarco hand-makes every pizza with imported Italian ingredients, fresh basil snipped with scissors, and a generous drizzle of olive oil. Each pie is a masterwork of simplicity and devotion.",
    address: "1424 Avenue J, Brooklyn, NY 11230",
    latitude: 40.625,
    longitude: -73.9614,
    email: "info@difara.com",
    phone: "(718) 258-1367",
    website: "https://www.difara.com",
    categoryId: 1, // restaurant
    chapterId: 4, // NY - New York
    status: "published",
  },
  {
    slug: "breads-bakery",
    name: "Breads Bakery",
    yearAwarded: 2024,
    description:
      "Known for their legendary chocolate babka and artisan breads baked fresh daily. Israeli-born baker Uri Scheft brings Old World technique to Union Square with exceptional sourdoughs, challah, and pastries.",
    address: "18 E 16th St, New York, NY 10003",
    latitude: 40.7367,
    longitude: -73.9916,
    phone: "(212) 633-2253",
    website: "https://www.breadsbakery.com",
    instagramUrl: "https://instagram.com/breadsbakery",
    categoryId: 5, // bakery
    chapterId: 4,
    status: "published",
  },
  {
    slug: "union-square-greenmarket",
    name: "Union Square Greenmarket",
    yearAwarded: 2023,
    description:
      "The crown jewel of NYC farmers markets, operating since 1976. Over 140 regional farmers, fishers, and bakers sell directly to the public year-round. A vital link between local agriculture and New York City's food culture.",
    address: "E 17th St & Union Square W, New York, NY 10003",
    latitude: 40.7359,
    longitude: -73.9911,
    website: "https://www.grownyc.org/greenmarket/manhattan-union-square-m",
    facebookUrl: "https://facebook.com/grownyc",
    categoryId: 4, // market
    chapterId: 4,
    status: "published",
  },
  {
    slug: "saxelby-cheesemongers",
    name: "Saxelby Cheesemongers",
    yearAwarded: 2023,
    description:
      "America's first all-American artisan cheese shop, sourcing exclusively from small Northeast farms. Anne Saxelby built direct relationships with cheesemakers, bringing exceptional farmstead cheeses to the Essex Market and beyond.",
    address: "88 Essex St, New York, NY 10002",
    latitude: 40.7185,
    longitude: -73.9882,
    email: "info@saxelbycheese.com",
    phone: "(212) 228-8204",
    website: "https://www.saxelbycheese.com",
    instagramUrl: "https://instagram.com/saxelbycheese",
    categoryId: 3, // producer
    chapterId: 4,
    status: "published",
  },
  {
    slug: "red-jacket-orchards",
    name: "Red Jacket Orchards",
    yearAwarded: 2022,
    description:
      "A fourth-generation family farm in the Finger Lakes growing over 50 varieties of tree fruits and berries. Their cold-pressed juices and farm-fresh produce are staples at NYC greenmarkets. Champions of sustainable orchard management.",
    address: "957 Route 5 & 20, Geneva, NY 14456",
    latitude: 42.8651,
    longitude: -76.9898,
    phone: "(315) 781-2749",
    website: "https://www.redjacketorchards.com",
    facebookUrl: "https://facebook.com/redjacketorchards",
    categoryId: 2, // farm
    chapterId: 4,
    status: "published",
  },
  {
    slug: "roberta-s",
    name: "Roberta's",
    yearAwarded: 2022,
    description:
      "A Bushwick pioneer that transformed a former garage into one of NYC's most celebrated pizzerias. Wood-fired pies made with ingredients from their own rooftop garden and local farms. A driving force in Brooklyn's food renaissance.",
    address: "261 Moore St, Brooklyn, NY 11206",
    latitude: 40.7052,
    longitude: -73.9339,
    website: "https://www.robertaspizza.com",
    instagramUrl: "https://instagram.com/robertaspizza",
    categoryId: 1, // restaurant
    chapterId: 4,
    status: "published",
  },
];

async function main() {
  for (const snail of nycSnails) {
    await prisma.snail.upsert({
      where: { slug: snail.slug },
      update: {},
      create: snail,
    });
  }
  console.log(`Seeded ${nycSnails.length} NYC snails`);
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
