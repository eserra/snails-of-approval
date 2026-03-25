import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pipelineStages } from "@/lib/stage-requirements";

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

    // Lapsed: track = "lead", stage = "Lapsed"
    const lapsedCount = lookup.get("lead|Lapsed") ?? 0;

    // Blocked: any track with stage = "Blocked"
    const blockedCount = groups
      .filter((g) => g.stage === "Blocked")
      .reduce((sum, g) => sum + g._count, 0);

    // Lead funnel in pipeline order
    const leadFunnel = pipelineStages.lead.map((stage) => ({
      stage,
      count: lookup.get(`lead|${stage}`) ?? 0,
    }));

    return NextResponse.json({
      activeCount,
      lapsedCount,
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
