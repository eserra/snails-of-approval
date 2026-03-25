"use client";

import { useState } from "react";
import {
  pipelineStages,
  stageCTAHints,
  stageRequirements,
  validateStageChange,
} from "@/lib/stage-requirements";

type PipelineProgressProps = {
  track: string;
  currentStage: string;
  attachments?: { category: string }[];
  snailId?: number;
  onStageChange?: () => void;
};

export default function PipelineProgress({
  track,
  currentStage,
  attachments = [],
  snailId,
  onStageChange,
}: PipelineProgressProps) {
  const [advancing, setAdvancing] = useState(false);

  const stages = pipelineStages[track];
  if (!stages) return null;

  const currentIndex = stages.indexOf(currentStage);
  const isSideTrack = currentStage === "Blocked" || currentStage === "Lapsed";
  const activeIndex = isSideTrack ? -1 : currentIndex;
  const isLastStage = currentIndex === stages.length - 1;

  const nextStage = !isSideTrack && !isLastStage ? stages[currentIndex + 1] : null;
  const nextWarnings = nextStage
    ? validateStageChange(nextStage, { attachments })
    : [];
  const hasUnmetNext = nextWarnings.some((w) => !w.met);

  const ctaHint = stageCTAHints[currentStage];

  async function handleAdvance(targetStage: string) {
    if (!snailId) return;
    setAdvancing(true);
    const res = await fetch(`/api/admin/snails/${snailId}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: targetStage }),
    });
    setAdvancing(false);
    if (res.ok) {
      onStageChange?.();
    }
  }

  return (
    <div className="space-y-3">
      {/* Arrow step bar */}
      <div className="flex items-stretch" role="list" aria-label="Pipeline stages">
        {stages.map((stage, i) => {
          const isCompleted = activeIndex >= 0 && i < activeIndex;
          const isCurrent = i === activeIndex;
          const isFuture = activeIndex < 0 || i > activeIndex;
          const isNext = !isSideTrack && i === activeIndex + 1;

          const warnings = isFuture
            ? validateStageChange(stage, { attachments })
            : [];
          const hasUnmetReqs = warnings.some((w) => !w.met);
          const reqLabels = (stageRequirements[stage] || []).map(
            (r) => r.label
          );

          const canClick = isNext && snailId && !advancing;
          const Tag = canClick ? "button" : "div";

          return (
            <Tag
              key={stage}
              type={canClick ? "button" : undefined}
              onClick={canClick ? () => handleAdvance(stage) : undefined}
              title={
                isNext
                  ? `Click to advance to ${stage}${hasUnmetReqs ? ` (requires: ${reqLabels.join(", ")})` : ""}`
                  : isFuture && reqLabels.length > 0
                    ? `Requires: ${reqLabels.join(", ")}`
                    : stage
              }
              className={`
                relative flex items-center justify-center gap-1.5 px-3 py-2.5
                text-xs font-medium flex-1 min-w-0 first:rounded-l-lg last:rounded-r-lg
                ${
                  isCompleted
                    ? "bg-amber-700 text-white"
                    : isCurrent
                      ? "bg-amber-50 text-amber-800 ring-2 ring-inset ring-amber-700"
                      : isNext
                        ? "bg-amber-100 text-amber-700 cursor-pointer hover:bg-amber-200 transition-colors"
                        : "bg-gray-100 text-gray-400"
                }
              `}
              role="listitem"
              aria-current={isCurrent ? "step" : undefined}
            >
              {isCompleted && (
                <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
              {isCurrent && (
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-amber-600" />
                </span>
              )}
              {isFuture && hasUnmetReqs && (
                <svg className="size-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              )}
              <span className="truncate">{stage}</span>
              {isNext && !advancing && (
                <svg className="size-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              )}
              {i < stages.length - 1 && (
                <svg
                  className={`absolute -right-2 top-0 h-full w-4 z-10 ${
                    isCompleted ? "text-amber-700" : isCurrent ? "text-amber-50" : "text-gray-100"
                  }`}
                  viewBox="0 0 16 40"
                  preserveAspectRatio="none"
                  fill="currentColor"
                >
                  <path d="M0 0 L12 20 L0 40 L0 0" />
                </svg>
              )}
            </Tag>
          );
        })}
      </div>

      {/* Side-track badge */}
      {isSideTrack && (
        <div
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
            currentStage === "Blocked"
              ? "bg-red-50 text-red-700 ring-1 ring-red-600/20"
              : "bg-gray-100 text-gray-600 ring-1 ring-gray-500/10"
          }`}
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Currently {currentStage}
        </div>
      )}

      {/* Requirement warnings for next stage */}
      {snailId && nextStage && hasUnmetNext && (
        <div>
          {nextWarnings
            .filter((w) => !w.met)
            .map((w) => (
              <p key={w.label} className="text-xs text-amber-600 flex items-center gap-1">
                <span>&#x26A0;</span> {nextStage} requires: {w.label}
              </p>
            ))}
        </div>
      )}

      {/* CTA hint */}
      {snailId && ctaHint && !isSideTrack && (
        <p className="text-xs text-gray-500">Next step: {ctaHint}</p>
      )}

      {/* Last stage message */}
      {snailId && isLastStage && !isSideTrack && ctaHint && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <svg className="size-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-green-800">{ctaHint}</span>
        </div>
      )}
    </div>
  );
}
