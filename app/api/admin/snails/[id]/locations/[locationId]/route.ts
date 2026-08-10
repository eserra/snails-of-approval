import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";
import { geocodeAddress } from "@/lib/geocode";

type Ctx = { params: Promise<{ id: string; locationId: string }> };

export async function PUT(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id, locationId } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if ("address" in body) {
    if (!body.address?.trim()) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }
    data.address = body.address.trim();
  }
  if ("label" in body) data.label = body.label || null;
  if ("kind" in body) data.kind = body.kind || "storefront";
  if ("city" in body) data.city = body.city || null;
  if ("state" in body) data.state = body.state || null;
  if ("borough" in body) data.borough = body.borough || null;
  if ("zip" in body) data.zip = body.zip || null;
  if ("isPublic" in body) data.isPublic = body.isPublic !== false;
  if ("isPrimary" in body) data.isPrimary = !!body.isPrimary;

  // Re-geocode when the address changed and no manual coordinates were supplied.
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

  const lId = parseInt(locationId);
  const location = await prisma.$transaction(async (tx) => {
    // Promoting this location to main demotes the snail's other locations.
    if (data.isPrimary === true) {
      await tx.location.updateMany({
        where: { snailId: parseInt(id), isPrimary: true, id: { not: lId } },
        data: { isPrimary: false },
      });
    }
    return tx.location.update({ where: { id: lId }, data });
  });

  return NextResponse.json(location);
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { locationId } = await params;
  await prisma.location.delete({ where: { id: parseInt(locationId) } });
  return NextResponse.json({ ok: true });
}
