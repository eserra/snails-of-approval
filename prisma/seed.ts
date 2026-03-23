import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // SFUSA two-level categories
  const topLevel = [
    { slug: "food-service", name: "Food Service" },
    { slug: "maker", name: "Maker" },
  ];

  for (const cat of topLevel) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  const foodService = await prisma.category.findUnique({
    where: { slug: "food-service" },
  });
  const maker = await prisma.category.findUnique({
    where: { slug: "maker" },
  });

  const foodServiceChildren = [
    "Restaurant",
    "Bar",
    "Brewery",
    "Caterer",
    "Wine Bar",
    "Wine Shop",
  ];

  const makerChildren = ["Other"];

  for (const name of foodServiceChildren) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    await prisma.category.upsert({
      where: { slug },
      update: { parent: { connect: { id: foodService!.id } } },
      create: { slug, name, parent: { connect: { id: foodService!.id } } },
    });
  }

  for (const name of makerChildren) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    await prisma.category.upsert({
      where: { slug },
      update: { parent: { connect: { id: maker!.id } } },
      create: { slug, name, parent: { connect: { id: maker!.id } } },
    });
  }

  console.log(
    `Seeded ${topLevel.length + foodServiceChildren.length + makerChildren.length} categories (2-level hierarchy)`
  );

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
    { email: "charlie.marshall@snailsofapproval.org", name: "Charlie Marshall" },
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
  console.log(`Seeded ${volunteers.length} volunteer users (password: changeme123)`);
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
