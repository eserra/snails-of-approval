import { prisma } from "@/lib/prisma";
import {
  MailchimpError,
  getAudienceId,
  mailchimpFetch,
  subscriberHash,
} from "./client";
import { buildMemberBody, cleanEmail, type ContactForSync } from "./mapping";

/** One problem row, structured so the UI can format it instead of parsing a string. */
export type SyncIssue = {
  snail: string; // the business this contact belongs to
  value: string; // the offending email value
  reason?: string; // present for API failures; invalid-email rows share one heading
};

export type SyncResult = {
  considered: number; // contacts carrying a non-empty email value
  synced: number; // upserted into Mailchimp
  skipped: number; // email value present but not a valid address
  duplicates: number; // same address as an earlier contact, merged
  failed: number; // sent, but Mailchimp rejected it
  invalidEmails: SyncIssue[]; // the skipped ones, capped for readability
  failures: SyncIssue[]; // the failed ones, capped for readability
};

// Mailchimp throttles at 10 simultaneous connections, so we upsert in bounded
// waves rather than firing every contact at once. Contact volume here is in the
// hundreds, so a PUT-per-member (which is what lets us preserve status — see
// client.ts) is well within budget.
const CONCURRENCY = 8;
const MAX_REPORTED_ERRORS = 30;

/**
 * Push every contact that has a valid email into the Mailchimp audience: upsert
 * the member and refresh its merge fields. Existing members keep their subscribe/
 * unsubscribe status untouched. The caller should run ensureSchema() first so
 * the merge fields exist.
 *
 * Contacts are deduplicated by address first — the same person is often a contact
 * on several snails, and two concurrent PUTs for one new address race into a
 * "already a list member" error. Values that aren't a single valid address
 * (URLs, "Name <email>", "a@x, b@x") are skipped and reported rather than sent.
 */
export async function syncContacts(): Promise<SyncResult> {
  const listId = getAudienceId();

  const contacts = await prisma.contact.findMany({
    where: { email: { not: null } },
    select: {
      name: true,
      email: true,
      role: true,
      snail: {
        select: {
          name: true,
          track: true,
          stage: true,
          businessStatus: true,
          yearAwarded: true,
          chapter: { select: { name: true } },
          category: { select: { name: true } },
        },
      },
    },
  });

  const result: SyncResult = {
    considered: 0,
    synced: 0,
    skipped: 0,
    duplicates: 0,
    failed: 0,
    invalidEmails: [],
    failures: [],
  };

  // Validate + dedupe into the set we'll actually send.
  const seen = new Set<string>();
  const toSend: {
    body: ReturnType<typeof buildMemberBody>;
    email: string;
    snail: string;
  }[] = [];

  for (const contact of contacts) {
    const raw = contact.email?.trim();
    if (!raw) continue; // no address at all — not something to report
    result.considered++;

    const email = cleanEmail(raw);
    if (!email) {
      result.skipped++;
      if (result.invalidEmails.length < MAX_REPORTED_ERRORS) {
        result.invalidEmails.push({ snail: contact.snail.name, value: raw });
      }
      continue;
    }

    const hash = subscriberHash(email);
    if (seen.has(hash)) {
      result.duplicates++;
      continue;
    }
    seen.add(hash);
    toSend.push({
      body: buildMemberBody(contact as ContactForSync, email),
      email,
      snail: contact.snail.name,
    });
  }

  for (let i = 0; i < toSend.length; i += CONCURRENCY) {
    const wave = toSend.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      wave.map(({ body, email }) =>
        mailchimpFetch(`/lists/${listId}/members/${subscriberHash(email)}`, {
          method: "PUT",
          body,
        })
      )
    );

    settled.forEach((outcome, j) => {
      if (outcome.status === "fulfilled") {
        result.synced++;
        return;
      }
      result.failed++;
      if (result.failures.length < MAX_REPORTED_ERRORS) {
        const reason =
          outcome.reason instanceof MailchimpError
            ? outcome.reason.detail ?? outcome.reason.message
            : String(outcome.reason);
        result.failures.push({
          snail: wave[j].snail,
          value: wave[j].email,
          reason,
        });
      }
    });
  }

  return result;
}
