
export { cleanEmail } from "@/lib/email";

// Shapes the contact + its snail into a Mailchimp member upsert body. The merge
// fields here are exactly the tags declared in schema.ts, and they are what the
// segments filter on. Crucially the body carries `status_if_new` but never
// `status`, so upserting an existing member updates their data without ever
// changing their subscribe/unsubscribe state.

export type ContactForSync = {
  name: string;
  email: string | null;
  roles: string[];
  snail: {
    name: string;
    track: string;
    stage: string | null;
    businessStatus: string | null;
    yearFirstAwarded: number | null;
    chapter: { name: string } | null;
    category: { name: string } | null;
  };
};

export type MemberBody = {
  email_address: string;
  status_if_new: "subscribed";
  merge_fields: Record<string, string | number>;
};

export function buildMemberBody(
  contact: ContactForSync,
  email: string
): MemberBody {
  const { snail } = contact;
  const merge: Record<string, string | number> = {
    FNAME: contact.name,
    ROLE: contact.roles.join(", "),
    SNAIL: snail.name,
    TRACK: snail.track,
    STAGE: snail.stage ?? "",
    BIZSTATUS: snail.businessStatus ?? "",
    CHAPTER: snail.chapter?.name ?? "",
    CATEGORY: snail.category?.name ?? "",
  };
  // Number merge field: send it only when set — Mailchimp rejects "" for a number.
  if (snail.yearFirstAwarded != null) merge.YEARAWARD = snail.yearFirstAwarded;

  return {
    email_address: email,
    status_if_new: "subscribed",
    merge_fields: merge,
  };
}
