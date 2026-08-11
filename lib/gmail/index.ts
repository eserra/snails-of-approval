import { OAuthGmailProvider } from "./oauth-provider";
import type { GmailProvider } from "./types";

export type GmailLookup = { chapterId: number } | { userId: number };

/**
 * The chapterId-or-userId account selector every Gmail route accepts, taken
 * from query params or a JSON body. Returns null when neither id is present;
 * callers answer that with a 400.
 */
export function parseGmailLookup(input: {
  chapterId?: string | number | null;
  userId?: string | number | null;
}): GmailLookup | null {
  if (input.chapterId) return { chapterId: parseInt(String(input.chapterId)) };
  if (input.userId) return { userId: parseInt(String(input.userId)) };
  return null;
}

export async function getGmailProvider(
  lookup: GmailLookup
): Promise<GmailProvider | null> {
  return OAuthGmailProvider.create(lookup);
}

export * from "./types";
export { encrypt, decrypt } from "./crypto";
export { syncEmails } from "./sync";
export { matchEmailToSnail } from "./matching";
export { getOAuth2Client } from "./oauth-provider";
