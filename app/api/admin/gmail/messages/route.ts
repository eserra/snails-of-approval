import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chapterId = searchParams.get("chapterId");
  const userId = searchParams.get("userId");
  const snailId = searchParams.get("snailId");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 50);

  if (!chapterId && !userId) {
    return NextResponse.json(
      { error: "chapterId or userId is required" },
      { status: 400 }
    );
  }

  const accountWhere = chapterId
    ? { chapterId: parseInt(chapterId) }
    : { userId: parseInt(userId!) };

  const account = await prisma.gmailAccount.findFirst({ where: accountWhere });
  if (!account) {
    return NextResponse.json({ messages: [], total: 0, connected: false });
  }

  const where = {
    gmailAccountId: account.id,
    ...(snailId ? { snailId: parseInt(snailId) } : {}),
  };

  const [messages, total] = await Promise.all([
    prisma.emailCache.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        snail: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.emailCache.count({ where }),
  ]);

  return NextResponse.json({
    messages,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    connected: true,
  });
}
