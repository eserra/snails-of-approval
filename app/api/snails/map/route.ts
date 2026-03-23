import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chapter = searchParams.get("chapter") || "";
  const category = searchParams.get("category") || "";
  const year = searchParams.get("year") || "";

  const where: Prisma.SnailWhereInput = {
    status: "published",
    latitude: { not: null },
    longitude: { not: null },
  };

  if (chapter) where.chapter = { slug: chapter };
  if (category) where.category = { slug: category };
  if (year) where.yearAwarded = parseInt(year);

  const snails = await prisma.snail.findMany({
    where,
    select: {
      slug: true,
      name: true,
      latitude: true,
      longitude: true,
      yearAwarded: true,
      category: { select: { name: true, slug: true } },
      chapter: { select: { name: true, slug: true } },
    },
  });

  return NextResponse.json(snails);
}
