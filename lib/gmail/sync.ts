import { prisma } from "@/lib/prisma";
import { OAuthGmailProvider } from "./oauth-provider";
import { buildEmailMatcher } from "./matching";

interface SyncResult {
  synced: number;
  matched: number;
}

export async function syncEmails(
  lookup: { chapterId: number } | { userId: number },
  options?: { fullSync?: boolean }
): Promise<SyncResult> {
  const provider = await OAuthGmailProvider.create(lookup);
  if (!provider) throw new Error("Gmail account not connected");
  const { account } = provider;

  // Determine the query: incremental sync fetches only newer messages
  let query: string | undefined;
  if (!options?.fullSync) {
    const latest = await prisma.emailCache.findFirst({
      where: { gmailAccountId: account.id },
      orderBy: { receivedAt: "desc" },
      select: { receivedAt: true },
    });
    if (latest) {
      const afterDate = latest.receivedAt.toISOString().split("T")[0];
      query = `after:${afterDate}`;
    }
  }

  const result: SyncResult = { synced: 0, matched: 0 };
  let pageToken: string | undefined;
  const maxPages = options?.fullSync ? 10 : 5;

  // One contact query for the whole sync; each message matches in memory.
  const matchEmail = account.chapterId
    ? await buildEmailMatcher(account.chapterId)
    : null;

  for (let page = 0; page < maxPages; page++) {
    const list = await provider.listMessages({
      query,
      maxResults: 50,
      pageToken,
    });

    if (list.messages.length === 0) break;

    for (const msg of list.messages) {
      const snailId = matchEmail
        ? matchEmail(msg.from.email, msg.to.map((t) => t.email).join(","))
        : null;

      await prisma.emailCache.upsert({
        where: {
          gmailAccountId_gmailMessageId: {
            gmailAccountId: account.id,
            gmailMessageId: msg.id,
          },
        },
        create: {
          gmailAccountId: account.id,
          gmailMessageId: msg.id,
          threadId: msg.threadId,
          subject: msg.subject,
          fromAddress: msg.from.email,
          toAddresses: msg.to.map((t) => t.email).join(","),
          snippet: msg.snippet,
          receivedAt: msg.date,
          isRead: msg.isRead,
          snailId,
        },
        update: {
          isRead: msg.isRead,
          snippet: msg.snippet,
          snailId: snailId ?? undefined,
        },
      });

      result.synced++;
      if (snailId) result.matched++;
    }

    pageToken = list.nextPageToken;
    if (!pageToken) break;
  }

  return result;
}
