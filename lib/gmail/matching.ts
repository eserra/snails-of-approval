import { prisma } from "@/lib/prisma";

/**
 * Matches an email to a snail by comparing From/To addresses
 * against snail contact email addresses within a chapter.
 */
export async function matchEmailToSnail(
  fromAddress: string,
  toAddresses: string,
  chapterId: number
): Promise<number | null> {
  const snails = await prisma.snail.findMany({
    where: { chapterId, email: { not: null } },
    select: { id: true, email: true },
  });

  const emailAddresses = [
    fromAddress.toLowerCase(),
    ...toAddresses.toLowerCase().split(",").map((s) => s.trim()),
  ];

  for (const snail of snails) {
    if (!snail.email) continue;
    const snailEmail = snail.email.toLowerCase();
    if (emailAddresses.some((addr) => addr.includes(snailEmail))) {
      return snail.id;
    }
  }

  return null;
}
