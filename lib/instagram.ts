// A snail's Instagram identity is captured as a handle (e.g. "stoic_cider"), not
// a full URL — that's what admins actually have on hand, and it's what we show.
// These helpers normalize whatever gets typed or pasted (a bare handle, an
// @-prefixed handle, or a full profile URL) down to the canonical handle, and
// build the public profile URL from a stored handle for display.

// Instagram handles: 1–30 characters, letters, numbers, periods and underscores.
const HANDLE_RE = /^[A-Za-z0-9._]{1,30}$/;

/** Reduce user input to a bare handle: strip @, whitespace, and any URL wrapper. */
export function normalizeInstagramHandle(value: string): string {
  let handle = value.trim();
  if (!handle) return "";
  // Someone pastes the whole profile URL — pull the handle back out of it.
  const fromUrl = handle.match(
    /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i
  );
  if (fromUrl) handle = fromUrl[1];
  return handle.replace(/^@+/, "").replace(/\/+$/, "");
}

/** True when the input normalizes to a well-formed handle. */
export function isValidInstagramHandle(value: string): boolean {
  return HANDLE_RE.test(normalizeInstagramHandle(value));
}

/** Public profile URL for a stored handle (which may itself be a legacy URL). */
export function instagramUrlFromHandle(handle: string): string {
  return `https://www.instagram.com/${normalizeInstagramHandle(handle)}`;
}
