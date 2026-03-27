import { OAuthGmailProvider } from "./oauth-provider";
import type { GmailProvider } from "./types";

export async function getGmailProvider(
  lookup: { chapterId: number } | { userId: number }
): Promise<GmailProvider | null> {
  return OAuthGmailProvider.create(lookup);
}

export * from "./types";
export { encrypt, decrypt } from "./crypto";
export { syncEmails } from "./sync";
export { matchEmailToSnail } from "./matching";
export { getOAuth2Client } from "./oauth-provider";
