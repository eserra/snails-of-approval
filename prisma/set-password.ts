import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Reset a single user's password directly in the database — for admin recovery
// (e.g. a locked-out admin). For normal changes, signed-in users have the
// self-serve page at /admin/account.
//
//   DATABASE_URL="<prod url>" npx tsx prisma/set-password.ts <email> <newPassword>
//
// Tip: prefix the command with a space to keep the password out of shell history
// (with the default HISTCONTROL=ignorespace).

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error(
    "Usage: npx tsx prisma/set-password.ts <email> <newPassword>"
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Look the user up first so a wrong/renamed email fails loudly instead of
  // updating zero rows silently (emails are @slowfoodnyc.org in production).
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user with email "${email}". Nothing changed.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { email }, data: { passwordHash } });
  console.log(
    `Updated password for ${user.name} <${email}> (role: ${user.role}).`
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
