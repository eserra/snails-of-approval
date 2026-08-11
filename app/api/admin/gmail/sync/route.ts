import { NextRequest, NextResponse } from "next/server";
import { requireWrite } from "@/lib/rbac";
import { parseGmailLookup } from "@/lib/gmail";
import { syncEmails } from "@/lib/gmail/sync";

export async function POST(request: NextRequest) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const body = await request.json();

  const lookup = parseGmailLookup(body);
  if (!lookup) {
    return NextResponse.json(
      { error: "chapterId or userId is required" },
      { status: 400 }
    );
  }

  const result = await syncEmails(lookup, { fullSync: body.fullSync });

  return NextResponse.json(result);
}
