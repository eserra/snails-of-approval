import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json();

  const chapter = await prisma.chapter.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name,
      state: body.state,
    },
  });

  return NextResponse.json(chapter);
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id } = await params;
  await prisma.chapter.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
