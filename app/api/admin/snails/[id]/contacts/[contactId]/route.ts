import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";
import { listContacts } from "@/lib/snail-relations";
import { isValidEmail } from "@/lib/email";

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
  if ("email" in body) {
    if (body.email?.trim() && !isValidEmail(body.email)) {
      return NextResponse.json(
        { error: `"${body.email}" is not a valid email address.` },
        { status: 400 }
      );
    }
    data.email = body.email || null;
  }
  if ("phone" in body) data.phone = body.phone || null;
  if ("phoneVanity" in body) data.phoneVanity = body.phoneVanity || null;
  if ("isPublic" in body) data.isPublic = !!body.isPublic;
  if ("isPrimary" in body) data.isPrimary = !!body.isPrimary;

  const cId = parseInt(contactId);

  // A snail always has exactly one primary contact, so it can't be unset directly —
  // promoting a different one is how you move it.
  if (data.isPrimary === false) {
    const current = await prisma.contact.findUnique({ where: { id: cId } });
    if (current?.isPrimary) {
      return NextResponse.json(
        { error: "A snail needs a main contact. Mark another contact as main instead." },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    // Promoting this contact to primary demotes the snail's other contacts.
    if (data.isPrimary === true) {
      await tx.contact.updateMany({
        where: { snailId: parseInt(id), isPrimary: true, id: { not: cId } },
        data: { isPrimary: false },
      });
    }
    return tx.contact.update({ where: { id: cId }, data });
  });

  return NextResponse.json(await listContacts(parseInt(id)));
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id, contactId } = await params;

  // A snail must keep at least one contact.
  const remaining = await prisma.contact.count({
    where: { snailId: parseInt(id), id: { not: parseInt(contactId) } },
  });
  if (remaining === 0) {
    return NextResponse.json(
      { error: "A snail needs at least one contact. Add another before removing this one." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const removed = await tx.contact.delete({ where: { id: parseInt(contactId) } });
    // Removing the main contact hands the role to the oldest one left, so a snail
    // is never left without one.
    if (removed.isPrimary) {
      const next = await tx.contact.findFirst({
        where: { snailId: parseInt(id) },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }], // same order as listContacts/listLocations
      });
      if (next) {
        await tx.contact.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }
  });
  return NextResponse.json(await listContacts(parseInt(id)));
}
