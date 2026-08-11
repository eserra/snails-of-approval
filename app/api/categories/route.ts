import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public list for filter dropdowns and the snail category picker. Deliberately
// omits snail counts: those would include unpublished drafts, and no public
// consumer needs them. The admin categories page gets counts from
// /api/admin/categories instead.
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } },
    },
  });

  return NextResponse.json(categories);
}
