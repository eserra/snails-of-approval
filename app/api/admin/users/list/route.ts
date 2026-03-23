import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lightweight user list for dropdowns (assignee picker)
// Available to any authenticated user (admin routes are behind middleware)
export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json(users);
}
