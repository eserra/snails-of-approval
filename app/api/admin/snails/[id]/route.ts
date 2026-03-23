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

  // Re-geocode if address changed and no manual coordinates
  let latitude = body.latitude ? parseFloat(body.latitude) : null;
  let longitude = body.longitude ? parseFloat(body.longitude) : null;
  if (body.address && !latitude && !longitude) {
    const coords = await geocodeAddress(body.address);
    if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
    }
  }

  const snail = await prisma.snail.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name,
      yearAwarded: body.yearAwarded ? parseInt(body.yearAwarded) : null,
      description: body.description || null,
      address: body.address || null,
      latitude,
      longitude,
      email: body.email || null,
      phone: body.phone || null,
      website: body.website || null,
      facebookUrl: body.facebookUrl || null,
      instagramUrl: body.instagramUrl || null,
      photoUrl: body.photoUrl || null,
      status: body.status || "draft",
      categoryId: body.categoryId ? parseInt(body.categoryId) : null,
      chapterId: parseInt(body.chapterId),
      // CRM fields
      track: body.track || "lead",
      stage: body.stage || null,
      formerAwardee: body.formerAwardee || false,
      renewalDueYear: body.renewalDueYear ? parseInt(body.renewalDueYear) : null,
      businessStatus: body.businessStatus || null,
      source: body.source || null,
      blockedReason: body.blockedReason || null,
      contactName: body.contactName || null,
      borough: body.borough || null,
      zip: body.zip || null,
      onSfusaMap: body.onSfusaMap || false,
      sfusaCategory: body.sfusaCategory || null,
      sfusaSubtype: body.sfusaSubtype || null,
      establishmentType: body.establishmentType || null,
      assigneeId: body.assigneeId ? parseInt(body.assigneeId) : null,
      lastTouchDate: body.lastTouchDate ? new Date(body.lastTouchDate) : null,
      welcomeLetterSent: body.welcomeLetterSent || false,
      stickersDelivered: body.stickersDelivered || false,
      diversityTags: body.diversityTags || null,
    },
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
