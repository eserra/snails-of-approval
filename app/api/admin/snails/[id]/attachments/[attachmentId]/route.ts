import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import { requireWrite } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string; attachmentId: string }> };

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { attachmentId } = await params;
  const attachment = await prisma.attachment.findUnique({
    where: { id: parseInt(attachmentId) },
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
