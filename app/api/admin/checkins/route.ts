import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Recent check-ins across every snail — powers the dashboard "Recent visits" feed.
export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");

  const checkIns = await prisma.checkIn.findMany({
    orderBy: [{ visitedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      author: { select: { name: true } },
      snail: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json(checkIns);
}
