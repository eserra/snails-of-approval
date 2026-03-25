"use client";

type FunnelStage = {
  stage: string;
  count: number;
};

type LeadsFunnelProps = {
  stages: FunnelStage[];
};

const stageColors: Record<string, { bg: string; text: string }> = {
  New: { bg: "bg-gray-200", text: "text-gray-700" },
  Contacted: { bg: "bg-amber-200", text: "text-amber-800" },
  "Application Filled": { bg: "bg-blue-200", text: "text-blue-800" },
  "Site Visit Completed": { bg: "bg-indigo-200", text: "text-indigo-800" },
  "Up for Vote": { bg: "bg-purple-200", text: "text-purple-800" },
};

export default function LeadsFunnel({ stages }: LeadsFunnelProps) {
  const topCount = stages[0]?.count ?? 0;

  return (
    <div className="space-y-1">
      {stages.map((s, i) => {
        // Bar width: percentage of top-of-funnel, minimum 20% so it's always visible
        const widthPct = topCount > 0 ? Math.max((s.count / topCount) * 100, 20) : 100;
        // Overall conversion rate vs first stage
        const overallPct = topCount > 0 ? Math.round((s.count / topCount) * 100) : 0;
        // Stage-to-stage conversion
        const prevCount = i > 0 ? stages[i - 1].count : null;
        const stagePct =
          prevCount !== null && prevCount > 0
            ? Math.round((s.count / prevCount) * 100)
            : null;

        const colors = stageColors[s.stage] ?? { bg: "bg-gray-200", text: "text-gray-700" };

        return (
          <div key={s.stage}>
            {/* Stage-to-stage conversion arrow between bars */}
            {stagePct !== null && (
              <div className="flex items-center gap-1 py-0.5 pl-1">
                <svg
                  className="size-3 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
                  />
                </svg>
                <span className="text-xs text-gray-400 font-medium">
                  {stagePct}%
                </span>
              </div>
            )}

            {/* Funnel bar */}
            <div className="flex items-center gap-3">
              <div
                className={`${colors.bg} rounded-lg px-3 py-2 transition-all`}
                style={{ width: `${widthPct}%` }}
              >
                <div className={`flex items-center justify-between gap-2 ${colors.text}`}>
                  <span className="text-sm font-medium truncate">
                    {s.stage}
                  </span>
                  <span className="text-sm font-bold tabular-nums shrink-0">
                    {s.count}
                  </span>
                </div>
              </div>
              <span className="text-xs text-gray-400 font-medium tabular-nums shrink-0">
                {overallPct}%
              </span>
            </div>
          </div>
        );
      })}

      {topCount === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center">
          No leads in the pipeline yet.
        </p>
      )}
    </div>
  );
}
