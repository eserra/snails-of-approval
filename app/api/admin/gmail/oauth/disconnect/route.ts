import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parseGmailLookup } from "@/lib/gmail";

export async function POST(request: NextRequest) {
  const forbidden = await requireRole(request, ["admin"]);
  if (forbidden) return forbidden;

  const body = await request.json();

  const lookup = parseGmailLookup(body);
  if (!lookup) {
    return NextResponse.json(
      { error: "chapterId or userId is required" },
      { status: 400 }
    );
  }

  const account = await prisma.gmailAccount.findFirst({ where: lookup });
  if (!account) {
    return NextResponse.json(
      { error: "Gmail account not found" },
      { status: 404 }
    );
  }

  // Cascade deletes EmailCache rows
  await prisma.gmailAccount.delete({ where: { id: account.id } });

  return NextResponse.json({ success: true });
}
