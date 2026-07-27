import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSfusaPrefillUrl } from "@/lib/sfusa-form";
import { parseDiversityTags } from "@/lib/diversity-tags";

type Ctx = { params: Promise<{ id: string }> };

// Redirects to the Slow Food USA submission form, prefilled with this snail's data.
// Protected by middleware (admin/editor). Meant to be opened in a new tab.
export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const snail = await prisma.snail.findUnique({
    where: { id: parseInt(id) },
    include: {
      chapter: { select: { name: true, state: true } },
      category: { select: { name: true, parent: { select: { name: true } } } },
      contacts: true,
    },
  });
  if (!snail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Business phone/email come from the main contact, falling back to the first
  // contact that has each.
  const primary = snail.contacts.find((c) => c.isPrimary) ?? snail.contacts[0];
  const phone = primary?.phone || snail.contacts.find((c) => c.phone)?.phone || null;
  const email = primary?.email || snail.contacts.find((c) => c.email)?.email || null;

  // The form's "Type of Business" is the top-level category (our category may be a
  // subtype, so use its parent's name when present).
  const topLevelType = snail.category
    ? snail.category.parent?.name || snail.category.name
    : null;

  const url = buildSfusaPrefillUrl({
    chapterName: snail.chapter?.name,
    name: snail.name,
    businessTypes: topLevelType ? [topLevelType] : [],
    ownershipSlugs: parseDiversityTags(snail.diversityTags),
    website: snail.website,
    facebook: snail.facebookUrl,
    instagram: snail.instagramUrl,
    otherSocial: snail.otherSocial,
    phone,
    phoneVanity: primary?.phoneVanity ?? null,
    email,
    streetAddress: snail.address,
    city: snail.city,
    state: snail.state || snail.chapter?.state || null,
    postalCode: snail.zip,
    latitude: snail.latitude != null ? String(snail.latitude) : null,
    longitude: snail.longitude != null ? String(snail.longitude) : null,
    description: snail.description,
  });

  return NextResponse.redirect(url);
}
