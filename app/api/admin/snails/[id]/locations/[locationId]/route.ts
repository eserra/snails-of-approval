import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";
import { CHRONO_ORDER, listLocations } from "@/lib/snail-relations";
import { resolveCoordinates } from "@/lib/geocode";

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
    const { latitude, longitude } = await resolveCoordinates(body);
    data.latitude = latitude;
    data.longitude = longitude;
  }

  const lId = parseInt(locationId);

  // Scope everything below to the snail in the path: the primary/keep-one
  // invariants are checked against this snail, so the target must belong to it.
  const owned = await prisma.location.findFirst({
    where: { id: lId, snailId: parseInt(id) },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // A snail always has exactly one main location, so it can't be unset directly —
  // promoting a different one is how you move it.
  if (data.isPrimary === false) {
    const current = await prisma.location.findUnique({ where: { id: lId } });
    if (current?.isPrimary) {
      return NextResponse.json(
        { error: "A snail needs a main location. Mark another location as main instead." },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    // Promoting this location to main demotes the snail's other locations.
    if (data.isPrimary === true) {
      await tx.location.updateMany({
        where: { snailId: parseInt(id), isPrimary: true, id: { not: lId } },
        data: { isPrimary: false },
      });
    }
    return tx.location.update({ where: { id: lId }, data });
  });

  return NextResponse.json(await listLocations(parseInt(id)));
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id, locationId } = await params;

  // The location must belong to the snail in the path, or the keep-one guard and
  // successor promotion below would operate on the wrong snail.
  const owned = await prisma.location.findFirst({
    where: { id: parseInt(locationId), snailId: parseInt(id) },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // A snail must keep at least one location.
  const remaining = await prisma.location.count({
    where: { snailId: parseInt(id), id: { not: parseInt(locationId) } },
  });
  if (remaining === 0) {
    return NextResponse.json(
      { error: "A snail needs at least one location. Add another before removing this one." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const removed = await tx.location.delete({ where: { id: parseInt(locationId) } });
    // Removing the main location hands the role to the oldest one left, so a snail
    // is never left without one.
    if (removed.isPrimary) {
      const next = await tx.location.findFirst({
        where: { snailId: parseInt(id) },
        orderBy: CHRONO_ORDER,
      });
      if (next) {
        await tx.location.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }
  });
  return NextResponse.json(await listLocations(parseInt(id)));
}
