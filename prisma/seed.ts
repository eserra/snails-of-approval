import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Categories
  const categories = [
    { slug: "restaurant", name: "Restaurant" },
    { slug: "farm", name: "Farm" },
    { slug: "producer", name: "Producer" },
    { slug: "market", name: "Market" },
    { slug: "bakery", name: "Bakery" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`Seeded ${categories.length} categories`);

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
  const passwordHash = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@snailsofapproval.org" },
    update: {},
    create: {
      email: "admin@snailsofapproval.org",
      passwordHash,
      name: "Admin",
      role: "admin",
    },
  });
  console.log("Seeded admin user (admin@snailsofapproval.org / admin123)");
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
