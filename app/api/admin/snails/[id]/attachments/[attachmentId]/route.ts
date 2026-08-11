import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import { requireWrite } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string; attachmentId: string }> };

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id, attachmentId } = await params;
  // Scope the lookup to the snail in the path so a stray id can't delete
  // another snail's file.
  const attachment = await prisma.attachment.findFirst({
    where: { id: parseInt(attachmentId), snailId: parseInt(id) },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete from Vercel Blob
  await del(attachment.fileUrl);

  // Delete from DB
  await prisma.attachment.delete({ where: { id: attachment.id } });

  return NextResponse.json({ ok: true });
}
