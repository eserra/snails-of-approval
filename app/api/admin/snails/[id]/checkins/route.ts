import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const checkIns = await prisma.checkIn.findMany({
    where: { snailId: parseInt(id) },
    orderBy: [{ visitedAt: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json(checkIns);
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const token = await getToken({ req: request });
  if (!token?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.notes?.trim()) {
    return NextResponse.json({ error: "Notes are required" }, { status: 400 });
  }

  const visitedAt = new Date(body.visitedAt);
  if (isNaN(visitedAt.getTime())) {
    return NextResponse.json(
      { error: "A valid visit date is required" },
      { status: 400 }
    );
  }

  const partySize = parseInt(body.partySize);
  if (!Number.isInteger(partySize) || partySize < 1) {
    return NextResponse.json(
      { error: "Number of people must be at least 1" },
      { status: 400 }
    );
  }

  // Optional dollar amount — accept blank/absent, reject anything non-numeric.
  let amount: number | null = null;
  if (body.amount !== undefined && body.amount !== null && `${body.amount}`.trim() !== "") {
    const parsed = Number(body.amount);
    if (isNaN(parsed) || parsed < 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }
    amount = parsed;
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      snailId: parseInt(id),
      authorId: parseInt(token.sub),
      visitedAt,
      partySize,
      occasion: body.occasion?.trim() || null,
      amount,
      notes: body.notes.trim(),
    },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json(checkIn, { status: 201 });
}
