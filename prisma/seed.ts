import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// SFUSA 2026 taxonomy from ArcGIS FeatureServer
const SFUSA_TAXONOMY = [
  {
    slug: "agricultural",
    name: "Agricultural",
    children: [
      { slug: "farm-orchard", name: "Farm / Orchard" },
      { slug: "ranch-livestock", name: "Ranch / Livestock" },
      { slug: "farmstead-dairy", name: "Farmstead Dairy" },
      { slug: "winery-vineyard", name: "Winery / Vineyard" },
      { slug: "fishery", name: "Fishery" },
      { slug: "agricultural-other", name: "Other" },
    ],
  },
  {
    slug: "maker",
    name: "Maker",
    children: [
      { slug: "brewery", name: "Brewery" },
      { slug: "cheesemaker", name: "Cheesemaker" },
      { slug: "cidery", name: "Cidery" },
      { slug: "distillery", name: "Distillery" },
      { slug: "salumeria", name: "Salumeria" },
      { slug: "vintner", name: "Vintner" },
      { slug: "maker-other", name: "Other" },
    ],
  },
  {
    slug: "food-service",
    name: "Food Service",
    children: [
      { slug: "bakery", name: "Bakery" },
      { slug: "bar", name: "Bar" },
      { slug: "cafe", name: "Cafe" },
      { slug: "caterer", name: "Caterer" },
      { slug: "food-truck", name: "Food Truck" },
      { slug: "restaurant", name: "Restaurant" },
      { slug: "food-service-other", name: "Other" },
    ],
  },
  {
    slug: "supporting-organization",
    name: "Supporting Organization",
    children: [
      { slug: "culinary-school", name: "Culinary School" },
      { slug: "farmers-market", name: "Farmers' Market" },
      { slug: "food-access", name: "Food Access" },
      { slug: "food-bank", name: "Food Bank" },
      { slug: "food-hub", name: "Food Hub" },
      { slug: "market", name: "Market" },
      { slug: "supporting-org-other", name: "Other" },
    ],
  },
];

async function main() {
  // Clean up old categories that don't exist in the SFUSA taxonomy
  const validSlugs = new Set<string>();
  for (const top of SFUSA_TAXONOMY) {
    validSlugs.add(top.slug);
    for (const child of top.children) {
      validSlugs.add(child.slug);
    }
  }

  const existing = await prisma.category.findMany();
  for (const cat of existing) {
    if (!validSlugs.has(cat.slug)) {
      // Unassign snails before deleting
      await prisma.snail.updateMany({
        where: { categoryId: cat.id },
        data: { categoryId: null },
      });
      await prisma.category.delete({ where: { id: cat.id } });
      console.log(`  Removed old category: ${cat.name} (${cat.slug})`);
    }
  }

  // Upsert SFUSA taxonomy
  for (const top of SFUSA_TAXONOMY) {
    const parent = await prisma.category.upsert({
      where: { slug: top.slug },
      update: { name: top.name, parentId: null },
      create: { slug: top.slug, name: top.name },
    });

    for (const child of top.children) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        update: {
          name: child.name,
          parent: { connect: { id: parent.id } },
        },
        create: {
          slug: child.slug,
          name: child.name,
          parent: { connect: { id: parent.id } },
        },
      });
    }
  }

  const totalCats =
    SFUSA_TAXONOMY.length +
    SFUSA_TAXONOMY.reduce((sum, t) => sum + t.children.length, 0);
  console.log(`Seeded ${totalCats} categories (SFUSA 2026 taxonomy)`);

  // Chapters
  const chapters = [
    { slug: "az-prescott", name: "AZ - Prescott", state: "AZ" },
    { slug: "ca-san-francisco", name: "CA - San Francisco", state: "CA" },
    { slug: "co-denver", name: "CO - Denver", state: "CO" },
    { slug: "ny-new-york", name: "NY - New York", state: "NY" },
  ];

  for (const ch of chapters) {
    await prisma.chapter.upsert({
      where: { slug: ch.slug },
      update: {},
      create: ch,
    });
  }
  console.log(`Seeded ${chapters.length} chapters`);

  // Admin user
  const defaultPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@snailsofapproval.org" },
    update: {},
    create: {
      email: "admin@snailsofapproval.org",
      passwordHash: defaultPassword,
      name: "Admin",
      role: "admin",
    },
  });
  console.log("Seeded admin user (admin@snailsofapproval.org / admin123)");

  // Volunteer users from the spreadsheet
  const volunteerPassword = await bcrypt.hash("changeme123", 12);
  const volunteers = [
    { email: "barbara@snailsofapproval.org", name: "Barbara" },
    { email: "kyle.karnuta@snailsofapproval.org", name: "Kyle Karnuta" },
    { email: "laura.hoffman@snailsofapproval.org", name: "Laura Hoffman" },
    { email: "matt@snailsofapproval.org", name: "Matt" },
    { email: "karen.guzman@snailsofapproval.org", name: "Karen Guzman" },
    { email: "edlin.choi@snailsofapproval.org", name: "Edlin Choi" },
    {
      email: "charlie.marshall@snailsofapproval.org",
      name: "Charlie Marshall",
    },
    { email: "richa@snailsofapproval.org", name: "Richa" },
  ];

  for (const v of volunteers) {
    await prisma.user.upsert({
      where: { email: v.email },
      update: {},
      create: {
        email: v.email,
        passwordHash: volunteerPassword,
        name: v.name,
        role: "editor",
      },
    });
  }
  console.log(
    `Seeded ${volunteers.length} volunteer users (password: changeme123)`
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
