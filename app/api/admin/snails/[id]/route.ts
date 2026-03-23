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
      yearAwarded: parseInt(body.yearAwarded),
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
      categoryId: parseInt(body.categoryId),
      chapterId: parseInt(body.chapterId),
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
