import { NextRequest, NextResponse } from "next/server";
import { requireWrite } from "@/lib/rbac";
import {
  deleteRelationRow,
  listContacts,
  updateRelationRow,
  type RelationWriteError,
} from "@/lib/snail-relations";
import { isValidEmail } from "@/lib/email";

type Ctx = { params: Promise<{ id: string; contactId: string }> };

function errorResponse(error: RelationWriteError): NextResponse {
  switch (error) {
    case "not_found":
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    case "cannot_unset_primary":
      return NextResponse.json(
        { error: "A snail needs a main contact. Mark another contact as main instead." },
        { status: 400 }
      );
    case "last_row":
      return NextResponse.json(
        { error: "A snail needs at least one contact. Add another before removing this one." },
        { status: 400 }
      );
  }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id, contactId } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if ("name" in body) {
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = body.name.trim();
  }
  if ("role" in body) data.role = body.role || "general";
  if ("email" in body) {
    if (body.email?.trim() && !isValidEmail(body.email)) {
      return NextResponse.json(
        { error: `"${body.email}" is not a valid email address.` },
        { status: 400 }
      );
    }
    data.email = body.email || null;
  }
  if ("phone" in body) data.phone = body.phone || null;
  if ("phoneVanity" in body) data.phoneVanity = body.phoneVanity || null;
  if ("isPublic" in body) data.isPublic = !!body.isPublic;
  if ("isPrimary" in body) data.isPrimary = !!body.isPrimary;

  const error = await updateRelationRow(
    (c) => c.contact,
    parseInt(id),
    parseInt(contactId),
    data
  );
  if (error) return errorResponse(error);

  return NextResponse.json(await listContacts(parseInt(id)));
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const { id, contactId } = await params;

  const error = await deleteRelationRow(
    (c) => c.contact,
    parseInt(id),
    parseInt(contactId)
  );
  if (error) return errorResponse(error);

  return NextResponse.json(await listContacts(parseInt(id)));
}
