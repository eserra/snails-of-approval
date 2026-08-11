import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requireAdmin } from "@/lib/rbac";

// Categories with snail counts for the admin management page. Counts include
// drafts on purpose — the page's delete guard must block removing a category
// that still has any snail (published or not) pointing at it.
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

export async function POST(request: NextRequest) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;

  const body = await request.json();

  let slug = slugify(body.name);
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const category = await prisma.category.create({
    data: {
      slug,
      name: body.name,
      parentId: body.parentId ? parseInt(body.parentId) : null,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
