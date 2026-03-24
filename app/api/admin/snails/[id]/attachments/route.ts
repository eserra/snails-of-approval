import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { attachmentConfig } from "@/lib/attachment-config";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const where: { snailId: number; category?: string } = {
    snailId: parseInt(id),
  };
  if (category) where.category = category;

  const attachments = await prisma.attachment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
  });

  return NextResponse.json(attachments);
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const token = await getToken({ req: request });
  if (!token?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const category = formData.get("category") as string | null;

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  // 10MB limit
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
  }

  // Cardinality check
  const config = attachmentConfig[category];
  if (config) {
    const count = await prisma.attachment.count({
      where: { snailId: parseInt(id), category },
    });
    if (count >= config.maxCount) {
      return NextResponse.json(
        { error: `Maximum ${config.maxCount} ${config.label} file(s) allowed` },
        { status: 400 }
      );
    }
  }

  const blob = await put(`snails/${id}/${category}/${file.name}`, file, {
    access: "public",
  });

  const attachment = await prisma.attachment.create({
    data: {
      fileName: file.name,
      fileUrl: blob.url,
      fileType: file.type,
      fileSize: file.size,
      category,
      snailId: parseInt(id),
      uploadedById: parseInt(token.sub),
    },
    include: { uploadedBy: { select: { name: true } } },
  });

  return NextResponse.json(attachment, { status: 201 });
}
