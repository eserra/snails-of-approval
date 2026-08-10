import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pipelineStages } from "@/lib/pipeline-stages";

export async function GET() {
  try {
    const groups = await prisma.snail.groupBy({
      by: ["track", "stage"],
      _count: true,
    });

    // Build a lookup: { "lead|New": 42, "active|Active": 10, ... }
    const lookup = new Map<string, number>();
    for (const g of groups) {
      lookup.set(`${g.track}|${g.stage}`, g._count);
    }

    // Active total: all snails with track = "active"
    const activeCount = groups
      .filter((g) => g.track === "active")
      .reduce((sum, g) => sum + g._count, 0);

    // Lapsed: track = "lead", stage = "lapsed"
    const lapsedCount = lookup.get("lead|lapsed") ?? 0;

    // Deferred: track = "lead", stage = "deferred" (board rejected, may reapply)
    const deferredCount = lookup.get("lead|deferred") ?? 0;

    // Blocked: any track with stage = "blocked"
    const blockedCount = groups
      .filter((g) => g.stage === "blocked")
      .reduce((sum, g) => sum + g._count, 0);

    // Lead funnel in pipeline order
    const leadFunnel = pipelineStages.lead.map((stage) => ({
      stage,
      count: lookup.get(`lead|${stage}`) ?? 0,
    }));

    return NextResponse.json({
      activeCount,
      lapsedCount,
      deferredCount,
      blockedCount,
      leadFunnel,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
