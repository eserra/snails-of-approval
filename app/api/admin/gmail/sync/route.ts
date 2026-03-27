import { NextRequest, NextResponse } from "next/server";
import { requireWrite } from "@/lib/rbac";
import { syncEmails } from "@/lib/gmail/sync";

export async function POST(request: NextRequest) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const body = await request.json();
  const { chapterId, userId, fullSync } = body;

  if (!chapterId && !userId) {
    return NextResponse.json(
      { error: "chapterId or userId is required" },
      { status: 400 }
    );
  }

  const lookup = chapterId
    ? { chapterId: parseInt(chapterId) }
    : { userId: parseInt(userId) };

  const result = await syncEmails(lookup, { fullSync });

  return NextResponse.json(result);
}
