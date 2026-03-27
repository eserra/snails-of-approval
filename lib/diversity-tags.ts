export type DiversityTag = {
  slug: string;
  label: string;
  description: string;
};

export const diversityTags: DiversityTag[] = [
  {
    slug: "bipoc",
    label: "BIPOC",
    description: "Black, Indigenous and Person of Color",
  },
  {
    slug: "lgbtqia2s",
    label: "LGBTQIA2S+",
    description:
      "Lesbian, Gay, Bisexual, Transgender, Queer/Questioning, Intersex, Asexual, Two-Spirit and more",
  },
  {
    slug: "person-with-disability",
    label: "Person with disability",
    description: "Owner or principal with a disability",
  },
  {
    slug: "veteran",
    label: "Veteran",
    description: "Veteran-owned",
  },
  {
    slug: "woman",
    label: "Woman",
    description: "Woman-owned",
  },
];

/** Look up a tag by slug */
export function getDiversityLabel(slug: string): string {
  return diversityTags.find((t) => t.slug === slug)?.label || slug;
}

/** Parse the stored JSON string to an array of slugs */
export function parseDiversityTags(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Legacy comma-separated format
    return value
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
}

/** Serialize slugs to JSON string for storage */
export function serializeDiversityTags(slugs: string[]): string | null {
  if (slugs.length === 0) return null;
  return JSON.stringify(slugs);
}
