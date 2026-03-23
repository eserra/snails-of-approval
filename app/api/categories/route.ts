import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { snails: { where: { status: "published" } } } },
    },
  });

  return NextResponse.json(categories);
}
