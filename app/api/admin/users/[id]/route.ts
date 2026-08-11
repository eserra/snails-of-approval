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
  const targetId = parseInt(id);
  const body = await request.json();

  const current = await prisma.user.findUnique({ where: { id: targetId } });
  if (!current) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Never let the last admin be demoted — whether editing yourself or the only
  // other admin — or the admin panel becomes unreachable by everyone.
  if (current.role === "admin" && body.role && body.role !== "admin") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last admin. Promote another admin first." },
        { status: 400 }
      );
    }
  }

  // Keep email unique, returning the same 409 as the create path instead of an
  // opaque 500 from the unique constraint.
  if (body.email && body.email !== current.email) {
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }
  }

  const data: { name: string; email: string; role: string; passwordHash?: string } = {
    name: body.name,
    email: body.email,
    role: body.role,
  };

  if (body.password) {
    data.passwordHash = await bcrypt.hash(body.password, 12);
  }

  const user = await prisma.user.update({
    where: { id: targetId },
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
