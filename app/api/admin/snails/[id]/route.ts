import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocode";
import { requireWrite } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const snail = await prisma.snail.findUnique({
    where: { id: parseInt(id) },
    include: {
      chapter: { select: { name: true } },
      category: { select: { name: true } },
      assignee: { select: { id: true, name: true } },
      notes: {
        orderBy: { createdAt: "desc" },
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
  set("address", body.address || null);
  set("email", body.email || null);
  set("phone", body.phone || null);
  set("website", body.website || null);
  set("facebookUrl", body.facebookUrl || null);
  set("instagramUrl", body.instagramUrl || null);
  set("photoUrl", body.photoUrl || null);
  set("status", body.status || "draft");
  set("establishmentType", body.establishmentType || null);
  set("contactName", body.contactName || null);
  set("borough", body.borough || null);
  set("zip", body.zip || null);
  set("diversityTags", body.diversityTags || null);
  set("source", body.source || null);
  set("blockedReason", body.blockedReason || null);
  set("businessStatus", body.businessStatus || null);
  set("track", body.track || "lead");
  set("stage", body.stage || null);

  if ("yearAwarded" in body)
    data.yearAwarded = body.yearAwarded ? parseInt(body.yearAwarded) : null;
  if ("renewalDueYear" in body)
    data.renewalDueYear = body.renewalDueYear
      ? parseInt(body.renewalDueYear)
      : null;
  if ("categoryId" in body)
    data.categoryId = body.categoryId ? parseInt(body.categoryId) : null;
  if ("chapterId" in body) data.chapterId = parseInt(body.chapterId);
  if ("assigneeId" in body)
    data.assigneeId = body.assigneeId ? parseInt(body.assigneeId) : null;
  if ("formerAwardee" in body) data.formerAwardee = body.formerAwardee || false;
  if ("onSfusaMap" in body) data.onSfusaMap = body.onSfusaMap || false;
  if ("welcomeLetterSent" in body)
    data.welcomeLetterSent = body.welcomeLetterSent || false;
  if ("stickersDelivered" in body)
    data.stickersDelivered = body.stickersDelivered || false;
  if ("lastTouchDate" in body)
    data.lastTouchDate = body.lastTouchDate
      ? new Date(body.lastTouchDate)
      : null;

  // Geocode if address changed and no manual coordinates
  if ("address" in body) {
    let latitude = body.latitude ? parseFloat(body.latitude) : null;
    let longitude = body.longitude ? parseFloat(body.longitude) : null;
    if (body.address && !latitude && !longitude) {
      const coords = await geocodeAddress(body.address);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }
    data.latitude = latitude;
    data.longitude = longitude;
  }

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
