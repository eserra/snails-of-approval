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
        category: { select: { name: true, parent: { select: { name: true } } } },
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

  // Build the inline locations, enforcing at most one main one (keep the first
  // flagged), geocoding any that arrived without coordinates.
  type LocationInput = {
    label?: string;
    kind?: string;
    address?: string;
    city?: string;
    state?: string;
    borough?: string;
    zip?: string;
    latitude?: string;
    longitude?: string;
    isPublic?: boolean;
    isPrimary?: boolean;
  };
  let mainTaken = false;
  const locationsCreate = [];
  const submittedLocations: LocationInput[] = Array.isArray(body.locations)
    ? body.locations.filter((l: LocationInput) => l.address?.trim())
    : [];
  for (const l of submittedLocations) {
    let latitude = l.latitude ? parseFloat(l.latitude) : null;
    let longitude = l.longitude ? parseFloat(l.longitude) : null;
    if (!latitude && !longitude) {
      const coords = await geocodeAddress(l.address!);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }
    const isPrimary = !!l.isPrimary && !mainTaken;
    if (isPrimary) mainTaken = true;
    locationsCreate.push({
      label: l.label || null,
      kind: l.kind || "storefront",
      address: l.address!.trim(),
      city: l.city || null,
      state: l.state || null,
      borough: l.borough || null,
      zip: l.zip || null,
      latitude,
      longitude,
      isPublic: l.isPublic !== false,
      isPrimary,
    });
  }
  // A snail with locations but none flagged: the first one is the main one.
  if (!mainTaken && locationsCreate.length) locationsCreate[0].isPrimary = true;

  // Build the inline contacts, enforcing at most one primary (keep the first flagged).
  let primaryTaken = false;
  const contactsCreate = Array.isArray(body.contacts)
    ? body.contacts
        .filter((c: { name?: string }) => c.name?.trim())
        .map(
          (c: {
            name: string;
            role?: string;
            email?: string;
            phone?: string;
            phoneVanity?: string;
            isPublic?: boolean;
            isPrimary?: boolean;
          }) => {
            const isPrimary = !!c.isPrimary && !primaryTaken;
            if (isPrimary) primaryTaken = true;
            return {
              name: c.name.trim(),
              role: c.role || "general",
              email: c.email || null,
              phone: c.phone || null,
              phoneVanity: c.phoneVanity || null,
              isPublic: !!c.isPublic,
              isPrimary,
            };
          }
        )
    : [];

  const snail = await prisma.snail.create({
    data: {
      slug,
      name: body.name,
      yearAwarded: body.yearAwarded ? parseInt(body.yearAwarded) : null,
      description: body.description || null,
      website: body.website || null,
      facebookUrl: body.facebookUrl || null,
      instagramUrl: body.instagramUrl || null,
      otherSocial: body.otherSocial || null,
      photoUrl: body.photoUrl || null,
      status: body.status || "draft",
      categoryId: body.categoryId ? parseInt(body.categoryId) : null,
      chapterId: parseInt(body.chapterId),
      createdById: token?.sub ? parseInt(token.sub) : null,
      // CRM fields
      track: body.track || "lead",
      stage: body.stage || null,
      formerAwardee: body.formerAwardee || false,
      renewalDueYear: body.renewalDueYear ? parseInt(body.renewalDueYear) : null,
      businessStatus: body.businessStatus || null,
      source: body.source || null,
      blockedReason: body.blockedReason || null,
      onSfusaMap: body.onSfusaMap || false,

      establishmentType: body.establishmentType || null,
      assigneeId: body.assigneeId ? parseInt(body.assigneeId) : null,
      lastTouchDate: body.lastTouchDate ? new Date(body.lastTouchDate) : null,
      welcomeLetterSent: body.welcomeLetterSent || false,
      stickersDelivered: body.stickersDelivered || false,
      diversityTags: body.diversityTags || null,
      contacts: contactsCreate.length ? { create: contactsCreate } : undefined,
      locations: locationsCreate.length ? { create: locationsCreate } : undefined,
    },
    include: {
      contacts: { orderBy: { createdAt: "asc" } },
      locations: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json(snail, { status: 201 });
}
