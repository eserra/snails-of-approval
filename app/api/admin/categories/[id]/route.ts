import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json();

  const data: { name?: string; parentId?: number | null } = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.parentId !== undefined)
    data.parentId = body.parentId ? parseInt(body.parentId) : null;

  const category = await prisma.category.update({
    where: { id: parseInt(id) },
    data,
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
