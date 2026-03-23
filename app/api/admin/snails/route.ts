import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { geocodeAddress } from "@/lib/geocode";
import { requireWrite } from "@/lib/rbac";

export async function GET() {
  try {
    const snails = await prisma.snail.findMany({
      orderBy: { name: "asc" },
      include: {
        chapter: { select: { name: true } },
        category: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    });
    return NextResponse.json(snails);
  } catch (error) {
    console.error("Failed to fetch snails:", error);
    return NextResponse.json({ error: "Failed to fetch snails" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;
  const token = await getToken({ req: request });
  const body = await request.json();

  let slug = slugify(body.name);
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
      createdById: token?.sub ? parseInt(token.sub) : null,
      // CRM fields
      awardStatus: body.awardStatus || null,
      pipelineStage: body.pipelineStage || null,
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

  return NextResponse.json(snail, { status: 201 });
}
