import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { requireAdmin } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;

  const body = await request.json();

  const slug = await uniqueSlug(body.name, async (s) =>
    Boolean(await prisma.chapter.findUnique({ where: { slug: s } }))
  );

  const chapter = await prisma.chapter.create({
    data: {
      slug,
      name: body.name,
      state: body.state,
    },
  });

  return NextResponse.json(chapter, { status: 201 });
}
