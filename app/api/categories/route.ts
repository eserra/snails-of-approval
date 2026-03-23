import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } },
      _count: { select: { snails: true } },
    },
  });

  return NextResponse.json(categories);
}
