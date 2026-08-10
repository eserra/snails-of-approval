import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";
import { geocodeAddress } from "@/lib/geocode";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const locations = await prisma.location.findMany({
    where: { snailId: parseInt(id) },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return NextResponse.json(locations);
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json();
  if (!body.address?.trim()) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  // Geocode if an address was given without manual coordinates.
  let latitude = body.latitude ? parseFloat(body.latitude) : null;
  let longitude = body.longitude ? parseFloat(body.longitude) : null;
  if (body.address && !latitude && !longitude) {
    const coords = await geocodeAddress(body.address);
    if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
    }
  }

  const snailId = parseInt(id);
  const location = await prisma.$transaction(async (tx) => {
    // Exactly one main location per snail: the first one added is always it, and
    // flagging a new one demotes the incumbent.
    const isFirst = (await tx.location.count({ where: { snailId } })) === 0;
    const isPrimary = isFirst || !!body.isPrimary;
    if (isPrimary && !isFirst) {
      await tx.location.updateMany({
        where: { snailId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    return tx.location.create({
      data: {
        label: body.label || null,
        kind: body.kind || "storefront",
        address: body.address.trim(),
        city: body.city || null,
        state: body.state || null,
        borough: body.borough || null,
        zip: body.zip || null,
        latitude,
        longitude,
        isPublic: body.isPublic !== false,
        isPrimary,
        snailId,
      },
    });
  });

  return NextResponse.json(location, { status: 201 });
}
