import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { requireRole } from "@/lib/rbac";
import { getOAuth2Client } from "@/lib/gmail";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
];

function signState(payload: string): string {
  const secret = process.env.NEXTAUTH_SECRET!;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export async function GET(request: NextRequest) {
  const forbidden = await requireRole(request, ["admin"]);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const chapterId = searchParams.get("chapterId");
  const userId = searchParams.get("userId");

  if (!chapterId && !userId) {
    return NextResponse.json(
      { error: "chapterId or userId is required" },
      { status: 400 }
    );
  }

  const payload = JSON.stringify({ chapterId, userId, ts: Date.now() });
  const state = signState(payload);

  const oauth2 = getOAuth2Client();
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state,
    prompt: "consent",
  });

  return NextResponse.json({ url });
}
