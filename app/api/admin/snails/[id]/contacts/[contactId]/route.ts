import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string; contactId: string }> };

export async function PUT(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { contactId } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if ("name" in body) {
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = body.name.trim();
  }
  if ("role" in body) data.role = body.role || "general";
  if ("email" in body) data.email = body.email || null;
  if ("phone" in body) data.phone = body.phone || null;
  if ("isPublic" in body) data.isPublic = !!body.isPublic;

  const contact = await prisma.contact.update({
    where: { id: parseInt(contactId) },
    data,
  });

  return NextResponse.json(contact);
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { contactId } = await params;
  await prisma.contact.delete({ where: { id: parseInt(contactId) } });
  return NextResponse.json({ ok: true });
}
