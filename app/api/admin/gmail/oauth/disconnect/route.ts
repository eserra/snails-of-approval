import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const forbidden = await requireRole(request, ["admin"]);
  if (forbidden) return forbidden;

  const body = await request.json();
  const { chapterId, userId } = body;

  if (!chapterId && !userId) {
    return NextResponse.json(
      { error: "chapterId or userId is required" },
      { status: 400 }
    );
  }

  const where = chapterId
    ? { chapterId: parseInt(chapterId) }
    : { userId: parseInt(userId) };

  const account = await prisma.gmailAccount.findFirst({ where });
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
