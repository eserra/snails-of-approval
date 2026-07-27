import { prisma } from "@/lib/prisma";

/**
 * Matches an email to a snail by comparing From/To addresses
 * against the email addresses of the snails' contacts within a chapter.
 */
export async function matchEmailToSnail(
  fromAddress: string,
  toAddresses: string,
  chapterId: number
): Promise<number | null> {
  const contacts = await prisma.contact.findMany({
    where: { email: { not: null }, snail: { chapterId } },
    select: { snailId: true, email: true },
  });

  const emailAddresses = [
    fromAddress.toLowerCase(),
    ...toAddresses.toLowerCase().split(",").map((s) => s.trim()),
  ];

  for (const contact of contacts) {
    if (!contact.email) continue;
    const contactEmail = contact.email.toLowerCase();
    if (emailAddresses.some((addr) => addr.includes(contactEmail))) {
      return contact.snailId;
    }
  }

  return null;
}
