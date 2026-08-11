import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { hashPassword, publicUserSelect } from "@/lib/users";

export async function GET(request: NextRequest) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: publicUserSelect,
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;

  const body = await request.json();

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(body.password);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      name: body.name,
      role: body.role || "editor",
    },
    select: publicUserSelect,
  });

  return NextResponse.json(user, { status: 201 });
}
