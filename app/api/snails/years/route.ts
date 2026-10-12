import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public list of award years for the filter dropdown, newest first. Scoped to
// published snails — and to those with a year on record — so the menu can never
// offer a year that returns an empty directory. The award predates the
// directory, so this is read from the data rather than a window off the current
// year: the earliest snails on record are from 2007.
export async function GET() {
  const rows = await prisma.snail.groupBy({
    by: ["yearFirstAwarded"],
    where: { status: "published", yearFirstAwarded: { not: null } },
    orderBy: { yearFirstAwarded: "desc" },
  });

  return NextResponse.json(rows.map((r) => r.yearFirstAwarded));
}
