import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import {
  buildSnailSheet,
  snailExportInclude,
  type ExportSnail,
} from "@/lib/export";

// GET /api/admin/export — the full CRM snails directory as an .xlsx download.
// Any signed-in admin role may read it (the route is already behind the /admin
// middleware gate; export is a read, so viewers are welcome to it too).
export async function GET() {
  const snails = (await prisma.snail.findMany({
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
