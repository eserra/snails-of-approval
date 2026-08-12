import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";
import { evaluateStageMove } from "@/lib/pipeline-stages";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Moves a snail to another stage on its own track — forwards as progress, or
 * backwards to correct the record. Both directions come through here so there's
 * one place that decides what a stage change means.
 *
 * The legality of the move is evaluated server-side rather than trusted from the
 * client: the pipeline bar only offers legal moves, but that's presentation, and
 * the previous version accepted any stage from anyone with write access.
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id } = await params;
  const snailId = parseInt(id);
  const body = await request.json();

  if (!body.stage) {
    return NextResponse.json({ error: "Stage is required" }, { status: 400 });
  }

  const snail = await prisma.snail.findUnique({
    where: { id: snailId },
    select: { track: true, stage: true },
  });
  if (!snail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const move = evaluateStageMove(snail.track, snail.stage, body.stage);
  if (!move.allowed) {
    return NextResponse.json({ error: move.reason }, { status: 400 });
  }

  const updated = await prisma.snail.update({
    where: { id: snailId },
    data: {
      stage: body.stage,
      // Only progress is engagement. Bumping this on a correction would claim
      // someone talked to the business when all they did was fix a mis-click,
      // and this date drives who gets followed up.
      ...(move.isProgress ? { lastTouchDate: new Date() } : {}),
    },
  });

  return NextResponse.json(updated);
}
