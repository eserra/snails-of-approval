import { NextRequest, NextResponse } from "next/server";
import { requireWrite } from "@/lib/rbac";
import {
  deleteRelationRow,
  listLocations,
  updateRelationRow,
  type RelationWriteError,
} from "@/lib/snail-relations";
import { resolveCoordinates } from "@/lib/geocode";

type Ctx = { params: Promise<{ id: string; locationId: string }> };

function errorResponse(error: RelationWriteError): NextResponse {
  switch (error) {
    case "not_found":
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    case "cannot_unset_primary":
      return NextResponse.json(
        { error: "A snail needs a main location. Mark another location as main instead." },
        { status: 400 }
      );
    case "last_row":
      return NextResponse.json(
        { error: "A snail needs at least one location. Add another before removing this one." },
        { status: 400 }
      );
  }
}

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

  const error = await updateRelationRow(
    (c) => c.location,
    parseInt(id),
    parseInt(locationId),
    data
  );
  if (error) return errorResponse(error);

  return NextResponse.json(await listLocations(parseInt(id)));
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id, locationId } = await params;

  const error = await deleteRelationRow(
    (c) => c.location,
    parseInt(id),
    parseInt(locationId)
  );
  if (error) return errorResponse(error);

  return NextResponse.json(await listLocations(parseInt(id)));
}
