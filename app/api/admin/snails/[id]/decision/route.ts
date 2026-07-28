import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Records the board decision fork out of the "Voted" stage:
 *  - approved → moves the snail onto the active track (Onboarding)
 *  - rejected → moves to the "Deferred" side-track (reapply later) + logs a note
 *  - reopen   → returns a Deferred snail to the lead funnel to reapply
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id } = await params;
  const snailId = parseInt(id);
  const body = await request.json();
  const outcome = body.outcome as "approved" | "rejected" | "reopen";

  const snail = await prisma.snail.findUnique({ where: { id: snailId } });
  if (!snail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();

  if (outcome === "approved") {
    // The SOA team's recommendation must be on record before an approval.
    const recommendation = body.recommendation ?? snail.recommendation;
    if (!recommendation) {
      return NextResponse.json(
        { error: "A recommendation is required before approving" },
        { status: 400 }
      );
    }
    const updated = await prisma.snail.update({
      where: { id: snailId },
      data: {
        track: "active",
        stage: "Onboarding",
        boardDecision: "approved",
        boardDecisionDate: now,
        lastTouchDate: now,
        recommendation,
        yearAwarded: snail.yearAwarded ?? now.getFullYear(),
      },
    });
    return NextResponse.json(updated);
  }

  if (outcome === "rejected") {
    const reason = (body.reason as string | undefined)?.trim();
    if (!reason) {
      return NextResponse.json(
        { error: "A reason is required when rejecting" },
        { status: 400 }
      );
    }
    const token = await getToken({ req: request });
    const authorId = token?.sub ? parseInt(token.sub) : null;

    const updated = await prisma.snail.update({
      where: { id: snailId },
      data: {
        stage: "Deferred",
        boardDecision: "rejected",
        boardDecisionDate: now,
        lastTouchDate: now,
        ...(body.recommendation ? { recommendation: body.recommendation } : {}),
        ...(authorId
          ? {
              notes: {
                create: {
                  content: `Board deferred the application: ${reason}`,
                  authorId,
                },
              },
            }
          : {}),
      },
    });
    return NextResponse.json(updated);
  }

  if (outcome === "reopen") {
    const updated = await prisma.snail.update({
      where: { id: snailId },
      data: {
        track: "lead",
        stage: body.stage || "Contacted",
        boardDecision: null,
        boardDecisionDate: null,
        lastTouchDate: now,
      },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
}
