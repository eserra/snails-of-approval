import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import {
  buildSnailSheet,
  snailExportInclude,
  type ExportSnail,
} from "@/lib/export";
import { parseStage, parseTab, snailListWhere } from "@/lib/snail-filters";

// GET /api/admin/export?tab=&mine=&notOnMap=&stage= — the CRM snails directory as an
// .xlsx download, filtered by the same rules as the admin Snails list. It shares
// the list's `where` builder (lib/snail-filters.ts), so the spreadsheet always
// matches what's on screen. With no params it exports every snail.
// Any signed-in admin role may read it (the route is already behind the /admin
// middleware gate; export is a read, so viewers are welcome to it too).
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const tab = parseTab(params.get("tab"));
  const mine = params.get("mine") === "1";
  const notOnMap = params.get("notOnMap") === "1";
  const stage = parseStage(tab, params.get("stage"));
  const token = await getToken({ req: request });
  const userId = token?.sub ? parseInt(token.sub) : null;

  const snails = (await prisma.snail.findMany({
    where: snailListWhere({ tab, mine, notOnMap, stage, userId }),
    orderBy: { name: "asc" },
    include: snailExportInclude,
  })) as ExportSnail[];

  const sheet = XLSX.utils.aoa_to_sheet(buildSnailSheet(snails));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Snails");

  const buffer: Buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="snails-of-approval-${stamp}.xlsx"`,
    },
  });
}
