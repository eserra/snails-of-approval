import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWriteUser } from "@/lib/rbac";
import { pipelineStages, sideTrackStages } from "@/lib/pipeline-stages";
import { validateStageChange } from "@/lib/stage-requirements";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireWriteUser(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();

  if (!body.stage) {
    return NextResponse.json({ error: "Stage is required" }, { status: 400 });
  }

  const snail = await prisma.snail.findUnique({
    where: { id: parseInt(id) },
    include: { attachments: { select: { category: true } } },
  });
  if (!snail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Same rules the pipeline bar applies client-side, enforced at the layer
  // that owns the write: the stage must belong to the snail's track (funnel
  // or side track), and non-admins can't skip unmet stage requirements.
  const validStages = [...(pipelineStages[snail.track] ?? []), ...sideTrackStages];
  if (!validStages.includes(body.stage)) {
    return NextResponse.json(
      { error: `"${body.stage}" is not a valid stage for this track` },
      { status: 400 }
    );
  }

  if (auth.role !== "admin") {
    const unmet = validateStageChange(body.stage, snail).filter((w) => !w.met);
    if (unmet.length > 0) {
      return NextResponse.json(
        { error: `Missing requirements: ${unmet.map((w) => w.label).join(", ")}` },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.snail.update({
    where: { id: snail.id },
    data: {
      stage: body.stage,
      lastTouchDate: new Date(),
    },
  });

  return NextResponse.json(updated);
}
