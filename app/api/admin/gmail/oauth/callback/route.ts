import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { getOAuth2Client, encrypt } from "@/lib/gmail";
import { syncEmails } from "@/lib/gmail/sync";

function verifyState(state: string): { chapterId?: string; userId?: string } | null {
  const lastDot = state.lastIndexOf(".");
  if (lastDot === -1) return null;

  const payload = state.substring(0, lastDot);
  const sig = state.substring(lastDot + 1);
  const secret = process.env.NEXTAUTH_SECRET!;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  if (sig !== expected) return null;

  const data = JSON.parse(payload);
  // Reject states older than 10 minutes
  if (Date.now() - data.ts > 10 * 60 * 1000) return null;

  return data;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin;

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/admin/chapters?gmail_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/admin/chapters?gmail_error=missing_params`
    );
  }

  const stateData = verifyState(state);
  if (!stateData) {
    return NextResponse.redirect(
      `${baseUrl}/admin/chapters?gmail_error=invalid_state`
    );
  }

  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    return NextResponse.redirect(
      `${baseUrl}/admin/chapters?gmail_error=no_tokens`
    );
  }

  // Get the email address from the Gmail profile
  oauth2.setCredentials(tokens);
  const { google } = await import("googleapis");
  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const profile = await gmail.users.getProfile({ userId: "me" });
  const emailAddress = profile.data.emailAddress!;

  const data = {
    emailAddress,
    accessToken: encrypt(tokens.access_token),
    refreshToken: encrypt(tokens.refresh_token),
    tokenExpiry: new Date(tokens.expiry_date!),
  };

  if (stateData.chapterId) {
    const chapterId = parseInt(stateData.chapterId);
    await prisma.gmailAccount.upsert({
      where: { chapterId },
      create: { ...data, chapterId },
      update: data,
    });
    // Kick off initial sync in the background (don't await)
    syncEmails({ chapterId }).catch(console.error);
  } else if (stateData.userId) {
    const userId = parseInt(stateData.userId);
    await prisma.gmailAccount.upsert({
      where: { userId },
      create: { ...data, userId },
      update: data,
    });
    syncEmails({ userId }).catch(console.error);
  }

  return NextResponse.redirect(
    `${baseUrl}/admin/chapters?gmail_connected=${encodeURIComponent(emailAddress)}`
  );
}
