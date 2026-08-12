import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSfusaPrefillUrl } from "@/lib/sfusa-form";
import { parseDiversityTags } from "@/lib/diversity-tags";

type Ctx = { params: Promise<{ id: string }> };

// Redirects to the Slow Food USA submission form, prefilled with this snail's data.
// Protected by middleware (admin/editor). Meant to be opened in a new tab.
//
// Active awardees only. The national map lists businesses that hold a Snail, so
// submitting a lead would list one that hasn't been approved. The detail page
// hides the link for leads, but that's presentation — the check belongs here too,
// since the URL is guessable and opening it is a one-click submission.
export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const snail = await prisma.snail.findUnique({
    where: { id: parseInt(id) },
    include: {
      chapter: { select: { name: true, state: true } },
      category: { select: { name: true, parent: { select: { name: true } } } },
      contacts: true,
      locations: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!snail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (snail.track !== "active") {
    return NextResponse.json(
      {
        error:
          "Only active awardees can be submitted to Slow Food USA. This snail is still a lead — record the board's approval first.",
      },
      { status: 400 }
    );
  }

  // Business phone/email come from the main contact, falling back to the first
  // contact that has each.
  const primary = snail.contacts.find((c) => c.isPrimary) ?? snail.contacts[0];
  const phone = primary?.phone || snail.contacts.find((c) => c.phone)?.phone || null;
  const email = primary?.email || snail.contacts.find((c) => c.email)?.email || null;

  // The map takes a single address: the main location, falling back to the first.
  const location =
    snail.locations.find((l) => l.isPrimary) ?? snail.locations[0] ?? null;

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
    instagram: snail.instagramHandle,
    otherSocial: snail.otherSocial,
    phone,
    phoneVanity: primary?.phoneVanity ?? null,
    email,
    streetAddress: location?.address ?? null,
    city: location?.city ?? null,
    state: location?.state || snail.chapter?.state || null,
    postalCode: location?.zip ?? null,
    latitude: location?.latitude != null ? String(location.latitude) : null,
    longitude: location?.longitude != null ? String(location.longitude) : null,
    description: snail.description,
  });

  return NextResponse.redirect(url);
}
