import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string; contactId: string }> };

export async function PUT(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id, contactId } = await params;
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
  if ("phoneVanity" in body) data.phoneVanity = body.phoneVanity || null;
  if ("isPublic" in body) data.isPublic = !!body.isPublic;
  if ("isPrimary" in body) data.isPrimary = !!body.isPrimary;

  const cId = parseInt(contactId);
  const contact = await prisma.$transaction(async (tx) => {
    // Promoting this contact to primary demotes the snail's other contacts.
    if (data.isPrimary === true) {
      await tx.contact.updateMany({
        where: { snailId: parseInt(id), isPrimary: true, id: { not: cId } },
        data: { isPrimary: false },
      });
    }
    return tx.contact.update({ where: { id: cId }, data });
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
