import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requireWrite } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const body = await request.json();

  let slug = slugify(body.name);
  const existing = await prisma.chapter.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const chapter = await prisma.chapter.create({
    data: {
      slug,
      name: body.name,
      state: body.state,
    },
  });

  return NextResponse.json(chapter, { status: 201 });
}
