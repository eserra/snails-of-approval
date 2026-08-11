// Shared DB bootstrap for the one-off scripts in this directory. They can't use
// the "@/" alias (they run under tsx, not Next), so the client they share lives
// beside them instead of in lib/prisma.ts.
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
