import { NextRequest, NextResponse } from "next/server";
import { getGmailProvider } from "@/lib/gmail";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const { searchParams } = new URL(request.url);
  const chapterId = searchParams.get("chapterId");
  const userId = searchParams.get("userId");

  if (!chapterId && !userId) {
    return NextResponse.json(
      { error: "chapterId or userId is required" },
      { status: 400 }
    );
  }

  const lookup = chapterId
    ? { chapterId: parseInt(chapterId) }
    : { userId: parseInt(userId!) };

  const provider = await getGmailProvider(lookup);
  if (!provider) {
    return NextResponse.json(
      { error: "Gmail account not connected" },
      { status: 404 }
    );
  }

  const thread = await provider.getThread(threadId);
  return NextResponse.json(thread);
}
