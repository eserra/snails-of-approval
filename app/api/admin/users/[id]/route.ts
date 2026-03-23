import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Ctx) {
  const token = await getToken({ req: request });
  if (token?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const data: { name: string; email: string; role: string; passwordHash?: string } = {
    name: body.name,
    email: body.email,
    role: body.role,
  };

  if (body.password) {
    data.passwordHash = await bcrypt.hash(body.password, 12);
  }

  const user = await prisma.user.update({
    where: { id: parseInt(id) },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const token = await getToken({ req: request });
  if (token?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent deleting yourself
  if (token.sub === id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
