import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseGmailLookup } from "@/lib/gmail";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const snailId = searchParams.get("snailId");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 50);

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

  const account = await prisma.gmailAccount.findFirst({ where: lookup });
  if (!account) {
    return NextResponse.json({ messages: [], total: 0, connected: false });
  }

  // The connection badge probes with pageSize=0 and reads only `connected`;
  // don't pay for a page query and a full count it will throw away.
  if (pageSize <= 0) {
    return NextResponse.json({ messages: [], total: 0, connected: true });
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
