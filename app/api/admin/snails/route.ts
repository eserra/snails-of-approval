import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { geocodeAddress } from "@/lib/geocode";
import { requireWrite } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  const snails = await prisma.snail.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      chapter: { select: { name: true } },
      category: { select: { name: true } },
    },
  });
  return NextResponse.json(snails);
}

export async function POST(request: NextRequest) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;
  const token = await getToken({ req: request });
  const body = await request.json();

  let slug = slugify(body.name);
  // Ensure unique slug
  const existing = await prisma.snail.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  // Geocode if address provided and no coordinates
  let latitude = body.latitude ? parseFloat(body.latitude) : null;
  let longitude = body.longitude ? parseFloat(body.longitude) : null;
  if (body.address && !latitude && !longitude) {
    const coords = await geocodeAddress(body.address);
    if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
    }
  }

  const snail = await prisma.snail.create({
    data: {
      slug,
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
      createdById: token?.sub ? parseInt(token.sub) : null,
    },
  });

  return NextResponse.json(snail, { status: 201 });
}
