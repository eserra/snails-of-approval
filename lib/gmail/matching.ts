import { prisma } from "@/lib/prisma";

/**
 * Matches emails to snails by comparing From/To addresses against the email
 * addresses of the snails' contacts within a chapter.
 *
 * Addresses are compared by exact equality (lowercased) — a substring test
 * would let e.g. `notbob@example.com` match a `bob@example.com` contact.
 *
 * The contact list is loaded once per matcher, so a sync that classifies
 * hundreds of messages costs a single query instead of one per message.
 */
export async function buildEmailMatcher(
  chapterId: number
): Promise<(fromAddress: string, toAddresses: string) => number | null> {
  const contacts = (
    await prisma.contact.findMany({
      where: { email: { not: null }, snail: { chapterId } },
      select: { snailId: true, email: true },
    })
  ).map((c) => ({ snailId: c.snailId, email: c.email!.trim().toLowerCase() }));

  return (fromAddress, toAddresses) => {
    // `fromAddress` and `toAddresses` are already bare addresses (callers pass
    // the parsed `.email` fields). First matching contact in list order wins.
    const emailAddresses = new Set(
      [fromAddress, ...toAddresses.split(",")]
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
    for (const contact of contacts) {
      if (emailAddresses.has(contact.email)) return contact.snailId;
    }
    return null;
  };
}
