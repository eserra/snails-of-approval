import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { ensureSchema, syncContacts } from "@/lib/mailchimp";

// Scheduled counterpart to the admin sync button. Vercel Cron hits this GET on
// the schedule in vercel.json. It carries no session, so it is guarded by a
// shared secret instead of RBAC: Vercel sends `Authorization: Bearer <CRON_SECRET>`.
// The guard is fail-closed — a missing CRON_SECRET rejects every request rather
// than leaving the endpoint open.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const expected = `Bearer ${secret}`;
  const provided = request.headers.get("authorization") ?? "";
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (
    expectedBuf.length !== providedBuf.length ||
    !timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSchema();
    const sync = await syncContacts();
    return NextResponse.json(sync);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Mailchimp sync failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
