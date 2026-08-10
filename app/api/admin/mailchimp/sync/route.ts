import { NextRequest, NextResponse } from "next/server";
import { requireWrite } from "@/lib/rbac";
import { ensureSchema, syncContacts, MailchimpError } from "@/lib/mailchimp";

// Manual "Sync to Mailchimp" trigger, mirroring the SFUSA map and Gmail syncs.
// Ensures the audience's merge fields and segments exist, then pushes contacts.
export async function POST(request: NextRequest) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  try {
    const schema = await ensureSchema();
    const sync = await syncContacts();
    return NextResponse.json({ schema, ...sync });
  } catch (e) {
    // A missing env var or a bad audience id surfaces here — report it plainly
    // rather than 500ing, so the admin sees what to fix.
    const message =
      e instanceof MailchimpError
        ? e.detail ?? e.message
        : e instanceof Error
          ? e.message
          : "Mailchimp sync failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
