import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedCategories } from "./sfusa-taxonomy.js";

// Categories-only seed. Unlike the full `npm run seed`, this touches nothing
// but the categories table — no users, no chapters — so it is safe to run
// against production to populate (or refresh) the SFUSA taxonomy.
//
//   DATABASE_URL="<production url>" npm run seed:categories

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

seedCategories(prisma)
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
