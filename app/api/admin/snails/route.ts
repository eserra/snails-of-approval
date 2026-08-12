import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { geocodeAddress } from "@/lib/geocode";
import { requireWrite } from "@/lib/rbac";
import { isValidEmail } from "@/lib/email";
import {
  isValidInstagramHandle,
  normalizeInstagramHandle,
} from "@/lib/instagram";
import { parseTab, snailListWhere, tabWhere } from "@/lib/snail-filters";

// GET /api/admin/snails?tab=&mine=&notOnMap= — the admin Snails table plus the
// tab-count badges, filtered server-side so the export can share the exact same
// rules (see lib/snail-filters.ts). The counts are over the whole dataset per
// tab (independent of the toggles), matching how the badges have always read.
export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const tab = parseTab(params.get("tab"));
    const mine = params.get("mine") === "1";
    const notOnMap = params.get("notOnMap") === "1";
    const token = await getToken({ req: request });
    const userId = token?.sub ? parseInt(token.sub) : null;

    const [snails, leads, active, lapsed, all] = await Promise.all([
      prisma.snail.findMany({
        where: snailListWhere({ tab, mine, notOnMap, userId }),
        orderBy: { name: "asc" },
        include: {
          chapter: { select: { name: true } },
          category: { select: { name: true, parent: { select: { name: true } } } },
          assignee: { select: { name: true } },
        },
      }),
      prisma.snail.count({ where: tabWhere("leads") }),
      prisma.snail.count({ where: tabWhere("active") }),
      prisma.snail.count({ where: tabWhere("lapsed") }),
      prisma.snail.count(),
    ]);

    return NextResponse.json({ snails, counts: { leads, active, lapsed, all } });
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

  // A snail must have someone to talk to and somewhere to point at. Checked before
  // geocoding so a rejected request costs no Nominatim calls.
  const hasContact =
    Array.isArray(body.contacts) &&
    body.contacts.some((c: { name?: string }) => c.name?.trim());
  const hasLocation =
    Array.isArray(body.locations) &&
    body.locations.some((l: { address?: string }) => l.address?.trim());
  if (!hasContact || !hasLocation) {
    const missing = [
      !hasContact ? "one contact" : null,
      !hasLocation ? "one location" : null,
    ].filter(Boolean);
    return NextResponse.json(
      { error: `A snail needs at least ${missing.join(" and ")}.` },
      { status: 400 }
    );
  }

  // Reject junk in contact emails at the door (one address per contact — split
  // multiple people into separate contacts). Mirrors the contact API routes.
  const badEmail = Array.isArray(body.contacts)
    ? body.contacts.find(
        (c: { email?: string }) => c.email?.trim() && !isValidEmail(c.email)
      )
    : undefined;
  if (badEmail) {
    return NextResponse.json(
      { error: `"${badEmail.email}" is not a valid email address.` },
      { status: 400 }
    );
  }

  // Instagram is stored as a handle, not a URL.
  const instagramHandle = body.instagramHandle?.trim()
    ? normalizeInstagramHandle(body.instagramHandle)
    : null;
  if (instagramHandle && !isValidInstagramHandle(instagramHandle)) {
    return NextResponse.json(
      { error: `"${body.instagramHandle}" is not a valid Instagram handle.` },
      { status: 400 }
    );
  }

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
  // A snail with contacts but none flagged: the first one is the main one.
  if (!primaryTaken && contactsCreate.length) contactsCreate[0].isPrimary = true;

  const snail = await prisma.snail.create({
    data: {
      slug,
      name: body.name,
      yearFirstAwarded: body.yearFirstAwarded ? parseInt(body.yearFirstAwarded) : null,
      description: body.description || null,
      website: body.website || null,
      facebookUrl: body.facebookUrl || null,
      instagramHandle: instagramHandle,
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
