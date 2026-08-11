import { prisma } from "@/lib/prisma";

/**
 * Matches an email to a snail by comparing From/To addresses against the
 * email addresses of the snails' contacts within a chapter.
 *
 * `fromAddress` and `toAddresses` are already bare addresses (the callers pass
 * the parsed `.email` fields), so matching is exact equality — a substring test
 * would let e.g. `notbob@example.com` match a `bob@example.com` contact.
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

  const emailAddresses = new Set(
    [fromAddress, ...toAddresses.split(",")]
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );

  for (const contact of contacts) {
    if (!contact.email) continue;
    if (emailAddresses.has(contact.email.trim().toLowerCase())) {
      return contact.snailId;
    }
  }

  return null;
}
