import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWriteUser } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const notes = await prisma.note.findMany({
    where: { snailId: parseInt(id) },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json(notes);
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await requireWriteUser(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const note = await prisma.note.create({
    data: {
      content: body.content.trim(),
      snailId: parseInt(id),
      authorId: auth.userId,
    },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json(note, { status: 201 });
}
