import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Lets the signed-in user change their own password (any role).
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const currentPassword = body.currentPassword as string | undefined;
  const newPassword = body.newPassword as string | undefined;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are both required" },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: parseInt(token.sub) },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    );
  }

  const unchanged = await bcrypt.compare(newPassword, user.passwordHash);
  if (unchanged) {
    return NextResponse.json(
      { error: "New password must be different from the current one" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
