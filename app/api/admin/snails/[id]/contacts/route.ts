import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";
import { listContacts } from "@/lib/snail-relations";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return NextResponse.json(await listContacts(parseInt(id)));
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const snailId = parseInt(id);
  await prisma.$transaction(async (tx) => {
    // Exactly one primary contact per snail: the first one added is always it, and
    // flagging a new one demotes the incumbent.
    const isFirst = (await tx.contact.count({ where: { snailId } })) === 0;
    const isPrimary = isFirst || !!body.isPrimary;
    if (isPrimary && !isFirst) {
      await tx.contact.updateMany({
        where: { snailId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    return tx.contact.create({
      data: {
        name: body.name.trim(),
        role: body.role || "general",
        email: body.email || null,
        phone: body.phone || null,
        phoneVanity: body.phoneVanity || null,
        isPublic: !!body.isPublic,
        isPrimary,
        snailId,
      },
    });
  });

  return NextResponse.json(await listContacts(snailId), { status: 201 });
}
