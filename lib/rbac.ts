import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

type Role = "admin" | "editor" | "viewer";

const WRITE_ROLES: Role[] = ["admin", "editor"];

export async function requireRole(
  request: NextRequest,
  allowedRoles: Role[]
): Promise<NextResponse | null> {
  const token = await getToken({ req: request });
  if (!token?.role || !allowedRoles.includes(token.role as Role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function requireWrite(
  request: NextRequest
): Promise<NextResponse | null> {
  return requireRole(request, WRITE_ROLES);
}
