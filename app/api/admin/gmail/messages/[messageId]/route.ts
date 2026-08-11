import { NextRequest, NextResponse } from "next/server";
import { getGmailProvider, parseGmailLookup } from "@/lib/gmail";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  const { searchParams } = new URL(request.url);

  const lookup = parseGmailLookup({
    chapterId: searchParams.get("chapterId"),
    userId: searchParams.get("userId"),
  });
  if (!lookup) {
    return NextResponse.json(
      { error: "chapterId or userId is required" },
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

  const message = await provider.getMessage(messageId);
  return NextResponse.json(message);
}
