import type { PrismaClient } from "../app/generated/prisma/client.js";

// The SFUSA 2026 category taxonomy (4 top-level, 27 sub-types), from the ArcGIS
// FeatureServer. Kept in one place so the full seed and the categories-only seed
// (prisma/seed-categories.ts) can't drift apart.
export const SFUSA_TAXONOMY = [
  {
    slug: "agricultural",
    name: "Agricultural",
    children: [
      { slug: "farm-orchard", name: "Farm / Orchard" },
      { slug: "ranch-livestock", name: "Ranch / Livestock" },
      { slug: "farmstead-dairy", name: "Farmstead Dairy" },
      { slug: "winery-vineyard", name: "Winery / Vineyard" },
      { slug: "fishery", name: "Fishery" },
      { slug: "agricultural-other", name: "Other" },
    ],
  },
  {
    slug: "maker",
    name: "Maker",
    children: [
      { slug: "brewery", name: "Brewery" },
      { slug: "cheesemaker", name: "Cheesemaker" },
      { slug: "cidery", name: "Cidery" },
      { slug: "distillery", name: "Distillery" },
      { slug: "salumeria", name: "Salumeria" },
      { slug: "vintner", name: "Vintner" },
      { slug: "maker-other", name: "Other" },
    ],
  },
  {
    slug: "food-service",
    name: "Food Service",
    children: [
      { slug: "bakery", name: "Bakery" },
      { slug: "bar", name: "Bar" },
      { slug: "cafe", name: "Cafe" },
      { slug: "caterer", name: "Caterer" },
      { slug: "food-truck", name: "Food Truck" },
      { slug: "restaurant", name: "Restaurant" },
      { slug: "food-service-other", name: "Other" },
    ],
  },
  {
    slug: "supporting-organization",
    name: "Supporting Organization",
    children: [
      { slug: "culinary-school", name: "Culinary School" },
      { slug: "farmers-market", name: "Farmers' Market" },
      { slug: "food-access", name: "Food Access" },
      { slug: "food-bank", name: "Food Bank" },
      { slug: "food-hub", name: "Food Hub" },
      { slug: "market", name: "Market" },
      { slug: "supporting-org-other", name: "Other" },
    ],
  },
];

/** Total number of categories the taxonomy defines (parents + children). */
export const TAXONOMY_COUNT =
  SFUSA_TAXONOMY.length +
  SFUSA_TAXONOMY.reduce((sum, t) => sum + t.children.length, 0);

/**
 * Bring the categories table in line with the SFUSA taxonomy: remove any
 * category not in it (unassigning its snails first), then upsert every parent
 * and child. Idempotent — safe to run repeatedly and safe in production, since
 * it only touches the categories table (and snail.categoryId for removed ones).
 */
export async function seedCategories(prisma: PrismaClient): Promise<void> {
  const validSlugs = new Set<string>();
  for (const top of SFUSA_TAXONOMY) {
    validSlugs.add(top.slug);
    for (const child of top.children) validSlugs.add(child.slug);
  }

  const existing = await prisma.category.findMany();
  for (const cat of existing) {
    if (!validSlugs.has(cat.slug)) {
      await prisma.snail.updateMany({
        where: { categoryId: cat.id },
        data: { categoryId: null },
      });
      await prisma.category.delete({ where: { id: cat.id } });
      console.log(`  Removed old category: ${cat.name} (${cat.slug})`);
    }
  }

  for (const top of SFUSA_TAXONOMY) {
    const parent = await prisma.category.upsert({
      where: { slug: top.slug },
      update: { name: top.name, parentId: null },
      create: { slug: top.slug, name: top.name },
    });

    for (const child of top.children) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        update: { name: child.name, parent: { connect: { id: parent.id } } },
        create: {
          slug: child.slug,
          name: child.name,
          parent: { connect: { id: parent.id } },
        },
      });
    }
  }

  console.log(`Seeded ${TAXONOMY_COUNT} categories (SFUSA 2026 taxonomy)`);
}
