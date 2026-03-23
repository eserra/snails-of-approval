import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json();

  const category = await prisma.category.update({
    where: { id: parseInt(id) },
    data: { name: body.name },
  });

  return NextResponse.json(category);
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id } = await params;
  await prisma.category.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
