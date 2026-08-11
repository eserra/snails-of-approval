import { NextRequest, NextResponse } from "next/server";
import { requireWrite } from "@/lib/rbac";
import { getGmailProvider, parseGmailLookup } from "@/lib/gmail";
import { syncEmails } from "@/lib/gmail/sync";

export async function POST(request: NextRequest) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const body = await request.json();
  const { to, subject, body: emailBody, threadId, inReplyTo } = body;

  const lookup = parseGmailLookup(body);
  if (!lookup) {
    return NextResponse.json(
      { error: "chapterId or userId is required" },
      { status: 400 }
    );
  }

  if (!to || !subject || !emailBody) {
    return NextResponse.json(
      { error: "to, subject, and body are required" },
      { status: 400 }
    );
  }

  const provider = await getGmailProvider(lookup);
  if (!provider) {
    return NextResponse.json(
      { error: "Gmail account not connected" },
      { status: 404 }
    );
  }

  const message = await provider.sendMessage({
    to,
    subject,
    body: emailBody,
    threadId,
    inReplyTo,
  });

  // Sync the sent message into the cache
  syncEmails(lookup).catch(console.error);

  return NextResponse.json(message);
}
