import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "./crypto";
import type {
  GmailProvider,
  GmailMessage,
  GmailThread,
  SendEmailParams,
  ListOptions,
  ListResult,
  EmailAddress,
} from "./types";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function parseEmailAddress(raw: string): EmailAddress {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2] };
  return { email: raw.trim() };
}

function parseAddressList(header: string | undefined): EmailAddress[] {
  if (!header) return [];
  return header.split(",").map((s) => parseEmailAddress(s.trim()));
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string | undefined {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())
    ?.value ?? undefined;
}

function decodeBody(part: gmail_v1.Schema$MessagePart): {
  text?: string;
  html?: string;
} {
  const result: { text?: string; html?: string } = {};

  if (part.mimeType === "text/plain" && part.body?.data) {
    result.text = Buffer.from(part.body.data, "base64url").toString("utf8");
  } else if (part.mimeType === "text/html" && part.body?.data) {
    result.html = Buffer.from(part.body.data, "base64url").toString("utf8");
  }

  if (part.parts) {
    for (const child of part.parts) {
      const childBody = decodeBody(child);
      if (childBody.text && !result.text) result.text = childBody.text;
      if (childBody.html && !result.html) result.html = childBody.html;
    }
  }

  return result;
}

function parseMessage(msg: gmail_v1.Schema$Message): GmailMessage {
  const headers = msg.payload?.headers;
  const body = msg.payload ? decodeBody(msg.payload) : {};

  return {
    id: msg.id!,
    threadId: msg.threadId!,
    subject: getHeader(headers, "Subject") || "(no subject)",
    from: parseEmailAddress(getHeader(headers, "From") || ""),
    to: parseAddressList(getHeader(headers, "To")),
    cc: parseAddressList(getHeader(headers, "Cc")) || undefined,
    date: new Date(getHeader(headers, "Date") || msg.internalDate || ""),
    snippet: msg.snippet || "",
    body,
    isRead: !msg.labelIds?.includes("UNREAD"),
    labels: msg.labelIds || [],
  };
}

function buildRawEmail(params: SendEmailParams, fromAddress: string): string {
  const boundary = `boundary_${Date.now()}`;
  const headers = [
    `From: ${fromAddress}`,
    `To: ${params.to}`,
    `Subject: ${params.threadId ? `Re: ${params.subject}` : params.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  if (params.inReplyTo) {
    headers.push(`In-Reply-To: ${params.inReplyTo}`);
    headers.push(`References: ${params.inReplyTo}`);
  }

  const body = [
    headers.join("\r\n"),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    params.body,
    `--${boundary}--`,
  ].join("\r\n");

  return Buffer.from(body).toString("base64url");
}

export class OAuthGmailProvider implements GmailProvider {
  private gmail: gmail_v1.Gmail;
  private accountId: number;
  private emailAddress: string;

  private constructor(
    gmail: gmail_v1.Gmail,
    accountId: number,
    emailAddress: string
  ) {
    this.gmail = gmail;
    this.accountId = accountId;
    this.emailAddress = emailAddress;
  }

  static async create(
    lookup: { chapterId: number } | { userId: number }
  ): Promise<OAuthGmailProvider | null> {
    const account = await prisma.gmailAccount.findFirst({
      where: lookup,
    });
    if (!account) return null;

    const oauth2 = getOAuth2Client();
    const accessToken = decrypt(account.accessToken);
    const refreshToken = decrypt(account.refreshToken);
    oauth2.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: account.tokenExpiry.getTime(),
    });

    // Auto-refresh if token is expired or expiring within 5 minutes
    if (account.tokenExpiry.getTime() < Date.now() + 5 * 60 * 1000) {
      const { credentials } = await oauth2.refreshAccessToken();
      await prisma.gmailAccount.update({
        where: { id: account.id },
        data: {
          accessToken: encrypt(credentials.access_token!),
          refreshToken: credentials.refresh_token
            ? encrypt(credentials.refresh_token)
            : account.refreshToken,
          tokenExpiry: new Date(credentials.expiry_date!),
        },
      });
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2 });
    return new OAuthGmailProvider(gmail, account.id, account.emailAddress);
  }

  async listMessages(options: ListOptions): Promise<ListResult> {
    const res = await this.gmail.users.messages.list({
      userId: "me",
      q: options.query,
      maxResults: options.maxResults || 20,
      pageToken: options.pageToken,
      labelIds: options.labelIds,
    });

    const messages: GmailMessage[] = [];
    for (const item of res.data.messages || []) {
      const msg = await this.gmail.users.messages.get({
        userId: "me",
        id: item.id!,
        format: "metadata",
        metadataHeaders: ["From", "To", "Cc", "Subject", "Date"],
      });
      const headers = msg.data.payload?.headers;
      messages.push({
        id: msg.data.id!,
        threadId: msg.data.threadId!,
        subject: getHeader(headers, "Subject") || "(no subject)",
        from: parseEmailAddress(getHeader(headers, "From") || ""),
        to: parseAddressList(getHeader(headers, "To")),
        date: new Date(
          getHeader(headers, "Date") || msg.data.internalDate || ""
        ),
        snippet: msg.data.snippet || "",
        body: {},
        isRead: !msg.data.labelIds?.includes("UNREAD"),
        labels: msg.data.labelIds || [],
      });
    }

    return {
      messages,
      nextPageToken: res.data.nextPageToken || undefined,
      resultSizeEstimate: res.data.resultSizeEstimate || 0,
    };
  }

  async getMessage(messageId: string): Promise<GmailMessage> {
    const res = await this.gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });
    return parseMessage(res.data);
  }

  async getThread(threadId: string): Promise<GmailThread> {
    const res = await this.gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "full",
    });
    const messages = (res.data.messages || []).map(parseMessage);
    const last = messages[messages.length - 1];
    return {
      id: res.data.id!,
      messages,
      subject: messages[0]?.subject || "(no subject)",
      snippet: last?.snippet || "",
      lastMessageDate: last?.date || new Date(),
    };
  }

  async sendMessage(params: SendEmailParams): Promise<GmailMessage> {
    const raw = buildRawEmail(params, this.emailAddress);
    const res = await this.gmail.users.messages.send({
      userId: "me",
      requestBody: { raw, threadId: params.threadId },
    });
    return this.getMessage(res.data.id!);
  }

  async getProfile(): Promise<{ emailAddress: string; messagesTotal: number }> {
    const res = await this.gmail.users.getProfile({ userId: "me" });
    return {
      emailAddress: res.data.emailAddress!,
      messagesTotal: res.data.messagesTotal || 0,
    };
  }
}

export { getOAuth2Client };
