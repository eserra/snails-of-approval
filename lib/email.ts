// Canonical check for a single, clean email address: one address only, no
// spaces, commas, semicolons, or angle brackets, and a lettered TLD (so a
// trailing dot is rejected). Shared by the contact form, the contact API
// routes, and the Mailchimp sync so all three agree on what counts as valid —
// junk like URLs, "Name <email>", or "a@x.com, b@x.com" is rejected everywhere.
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** The address if it's a single valid one, else null (empty or malformed). */
export function cleanEmail(raw: string | null | undefined): string | null {
  const e = raw?.trim();
  if (!e) return null;
  return isValidEmail(e) ? e : null;
}
