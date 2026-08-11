import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { publicSnailWhere } from "@/lib/snail-filters";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "name";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where = publicSnailWhere(searchParams);

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.SnailOrderByWithRelationInput =
    sort === "year"
      ? { yearAwarded: "desc" }
      : sort === "recent"
        ? { createdAt: "desc" }
        : { name: "asc" };

  const [snails, total] = await Promise.all([
    prisma.snail.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        chapter: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
      },
    }),
    prisma.snail.count({ where }),
  ]);

  return NextResponse.json({
    snails,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
