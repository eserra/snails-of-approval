import { createHash } from "crypto";

// A thin fetch wrapper over the Mailchimp Marketing API v3. We roll our own
// rather than pull in @mailchimp/mailchimp_marketing (which ships no types and
// would need wrapping anyway) — this matches the Gmail integration's hand-rolled
// OAuthGmailProvider, and it lets us control request bodies exactly. That
// control matters for one thing above all: on member upserts we send only
// `status_if_new` and never `status`, so an existing member's subscribe/
// unsubscribe state in Mailchimp is preserved on every sync.

function getApiKey(): string {
  const key = process.env.MAILCHIMP_API_KEY;
  if (!key) throw new Error("MAILCHIMP_API_KEY env var is required");
  return key;
}

/** The Marketing API is region-scoped; the datacenter is the suffix on the key. */
function getDatacenter(): string {
  const key = getApiKey();
  const dc = key.split("-")[1];
  if (!dc) {
    throw new Error(
      "MAILCHIMP_API_KEY is malformed — expected the form '<key>-us21'"
    );
  }
  return dc;
}

export function getAudienceId(): string {
  const id = process.env.MAILCHIMP_AUDIENCE_ID;
  if (!id) throw new Error("MAILCHIMP_AUDIENCE_ID env var is required");
  return id;
}

/** Mailchimp identifies a member by the MD5 of their lowercased email address. */
export function subscriberHash(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

export class MailchimpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: string
  ) {
    super(message);
    this.name = "MailchimpError";
  }
}

/**
 * Issue a request against the Marketing API. Non-2xx responses throw a
 * MailchimpError carrying the status and Mailchimp's `detail` message, which is
 * usually the actionable part (e.g. "<email> looks fake or invalid").
 */
export async function mailchimpFetch<T = unknown>(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const dc = getDatacenter();
  const url = `https://${dc}.api.mailchimp.com/3.0${path}`;

  // Basic auth: any username, API key as password.
  const auth = Buffer.from(`anystring:${getApiKey()}`).toString("base64");

  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const detail = (data as { detail?: string } | undefined)?.detail;
    throw new MailchimpError(
      `Mailchimp ${init?.method ?? "GET"} ${path} failed (${res.status})`,
      res.status,
      detail
    );
  }

  return data as T;
}
