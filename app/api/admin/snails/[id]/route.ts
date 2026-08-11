import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";
import {
  isValidInstagramHandle,
  normalizeInstagramHandle,
} from "@/lib/instagram";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const snail = await prisma.snail.findUnique({
    where: { id: parseInt(id) },
    include: {
      chapter: { select: { name: true } },
      category: { select: { name: true } },
      assignee: { select: { id: true, name: true } },
      contacts: { orderBy: { createdAt: "asc" } },
      locations: { orderBy: { createdAt: "asc" } },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
      checkIns: {
        orderBy: [{ visitedAt: "desc" }, { createdAt: "desc" }],
        include: { author: { select: { name: true } } },
      },
      attachments: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true } } },
      },
    },
  });
  if (!snail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(snail);
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;
  const { id } = await params;
  const body = await request.json();

  // Build data object with only the fields present in the request
  const data: Record<string, unknown> = {};

  // Helper: only set a field if it was sent in the body
  function set(key: string, value: unknown) {
    if (key in body) data[key] = value;
  }

  set("name", body.name);
  set("description", body.description || null);
  set("website", body.website || null);
  set("facebookUrl", body.facebookUrl || null);
  // Instagram is stored as a handle, not a URL.
  if ("instagramHandle" in body) {
    const handle = body.instagramHandle?.trim()
      ? normalizeInstagramHandle(body.instagramHandle)
      : null;
    if (handle && !isValidInstagramHandle(handle)) {
      return NextResponse.json(
        { error: `"${body.instagramHandle}" is not a valid Instagram handle.` },
        { status: 400 }
      );
    }
    data.instagramHandle = handle;
  }
  set("otherSocial", body.otherSocial || null);
  set("photoUrl", body.photoUrl || null);
  set("status", body.status || "draft");
  set("establishmentType", body.establishmentType || null);
  set("diversityTags", body.diversityTags || null);
  set("source", body.source || null);
  set("blockedReason", body.blockedReason || null);
  set("recommendation", body.recommendation || null);
  set("businessStatus", body.businessStatus || null);
  set("track", body.track || "lead");
  set("stage", body.stage || null);

  set("yearAwarded", body.yearAwarded ? parseInt(body.yearAwarded) : null);
  set("categoryId", body.categoryId ? parseInt(body.categoryId) : null);
  set("chapterId", parseInt(body.chapterId));
  set("assigneeId", body.assigneeId ? parseInt(body.assigneeId) : null);
  set("formerAwardee", body.formerAwardee || false);
  set("onSfusaMap", body.onSfusaMap || false);
  set("welcomeLetterSent", body.welcomeLetterSent || false);
  set("stickersDelivered", body.stickersDelivered || false);
  set("digitalAssetsSent", body.digitalAssetsSent || false);
  set("certificateSent", body.certificateSent || false);
  set("pressReleaseSent", body.pressReleaseSent || false);
  set("socialAnnounced", body.socialAnnounced || false);
  set(
    "certificateRequestedDate",
    body.certificateRequestedDate ? new Date(body.certificateRequestedDate) : null
  );
  set("lastTouchDate", body.lastTouchDate ? new Date(body.lastTouchDate) : null);

  const snail = await prisma.snail.update({
    where: { id: parseInt(id) },
    data,
  });

  return NextResponse.json(snail);
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;
  const { id } = await params;
  await prisma.snail.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
