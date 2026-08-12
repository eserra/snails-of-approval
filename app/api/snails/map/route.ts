import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

// One marker per public, geocoded location. A snail with several locations gets
// several markers, all linking back to the same snail page.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chapter = searchParams.get("chapter") || "";
  const category = searchParams.get("category") || "";
  const year = searchParams.get("year") || "";

  const snail: Prisma.SnailWhereInput = { status: "published" };
  if (chapter) snail.chapter = { slug: chapter };
  if (category) snail.category = { slug: category };
  if (year) snail.yearFirstAwarded = parseInt(year);

  const where: Prisma.LocationWhereInput = {
    isPublic: true,
    latitude: { not: null },
    longitude: { not: null },
    snail,
  };

  const locations = await prisma.location.findMany({
    where,
    select: {
      id: true,
      kind: true,
      label: true,
      address: true,
      latitude: true,
      longitude: true,
      isPrimary: true,
      snail: {
        select: {
          slug: true,
          name: true,
          yearFirstAwarded: true,
          category: { select: { name: true, slug: true } },
          chapter: { select: { name: true, slug: true } },
        },
      },
    },
  });

  return NextResponse.json(
    locations.map((l) => ({
      id: l.id,
      kind: l.kind,
      label: l.label,
      address: l.address,
      latitude: l.latitude,
      longitude: l.longitude,
      isPrimary: l.isPrimary,
      slug: l.snail.slug,
      name: l.snail.name,
      yearFirstAwarded: l.snail.yearFirstAwarded,
      category: l.snail.category,
      chapter: l.snail.chapter,
    }))
  );
}
