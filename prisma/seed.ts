import { prisma } from "./script-client.js";
import { hashPassword } from "../lib/users.js";
import { seedCategories } from "./sfusa-taxonomy.js";

async function main() {
  // Categories: the SFUSA taxonomy (shared with prisma/seed-categories.ts).
  await seedCategories(prisma);

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
  const defaultPassword = await hashPassword("admin123");
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
  const volunteerPassword = await hashPassword("changeme123");
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
