import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json();

  if (!body.stage) {
    return NextResponse.json({ error: "Stage is required" }, { status: 400 });
  }

  const snail = await prisma.snail.update({
    where: { id: parseInt(id) },
    data: {
      stage: body.stage,
      lastTouchDate: new Date(),
    },
  });

  return NextResponse.json(snail);
}
