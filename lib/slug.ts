export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Slugify a name, appending a timestamp when the slug is already taken.
 * `exists` reports whether a candidate slug is in use (typically a
 * findUnique on the model's slug column).
 */
export async function uniqueSlug(
  name: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const slug = slugify(name);
  return (await exists(slug)) ? `${slug}-${Date.now()}` : slug;
}
