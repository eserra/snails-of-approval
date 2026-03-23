import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const snail = await prisma.snail.findUnique({
    where: { slug, status: "published" },
    include: {
      chapter: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
    },
  });

  if (!snail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(snail);
}
