"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { stageLabel } from "@/lib/pipeline-stages";
import SnailIcon from "@/components/SnailIcon";
import CheckInModal from "@/components/CheckInModal";
import { stagesForTab } from "@/lib/snail-filters";

// Small stroke icons so the action bar signals direction at a glance: a download
// arrow for the local export, a refresh loop for the inbound SFUSA check, an
// up-arrow for the outbound Mailchimp push.
const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const DownloadIcon = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const RefreshIcon = () => (
  <svg {...iconProps} aria-hidden="true">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const UploadIcon = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const KebabIcon = () => (
  <svg {...iconProps} fill="currentColor" stroke="none" aria-hidden="true">
    <circle cx="12" cy="5" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="19" r="1.6" />
  </svg>
);

type Snail = {
  id: number;
  name: string;
  slug: string;
  status: string;
  track: string;
  stage: string | null;
  formerAwardee: boolean;
  onSfusaMap: boolean;
  assigneeId: number | null;
  chapter: { name: string };
  category: { name: string; parent: { name: string } | null } | null;
  assignee: { name: string } | null;
};

type Tab = "leads" | "active" | "lapsed" | "all";
type Counts = Record<Tab, number>;

const stageBadge: Record<string, string> = {
  new: "bg-gray-100 text-gray-600 ring-1 ring-gray-500/10",
  contacted: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  applied: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
  visited: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20",
  board_review: "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20",
  onboarding: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-600/20",
  active: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
  renewal_due: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  renewal_submitted: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
  lapsed: "bg-gray-100 text-gray-600 ring-1 ring-gray-500/10",
  blocked: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
};

// The list, its tab-count badges, and the export all share one filter contract,
// enforced server-side (lib/snail-filters.ts). The client just names the view.
function filterQuery(
  tab: Tab,
  mineOnly: boolean,
  notOnMapOnly: boolean,
  stage: string | null
) {
  const params = new URLSearchParams({ tab });
  if (mineOnly) params.set("mine", "1");
  if (notOnMapOnly) params.set("notOnMap", "1");
  if (stage) params.set("stage", stage);
  return params.toString();
}

export default function AdminSnailsPage() {
  const [snails, setSnails] = useState<Snail[]>([]);
  const [counts, setCounts] = useState<Counts>({
    leads: 0,
    active: 0,
    lapsed: 0,
    all: 0,
  });
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("leads");
  // One stage within the tab, or null for all of them.
  const [stage, setStage] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [notOnMapOnly, setNotOnMapOnly] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mcSyncing, setMcSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [mcReport, setMcReport] = useState<McReport | null>(null);
  const [checkInFor, setCheckInFor] = useState<Snail | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the integrations menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function loadSnails() {
    setLoading(true);
    return fetch(
      `/api/admin/snails?${filterQuery(tab, mineOnly, notOnMapOnly, stage)}`
    )
      .then((r) => r.json())
      .then((data) => {
        setSnails(data.snails);
        setCounts(data.counts);
        setStageCounts(data.stageCounts ?? {});
        setLoading(false);
      });
  }

  // Re-fetch whenever the view changes — filtering now happens in the query.
  useEffect(() => {
    loadSnails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, mineOnly, notOnMapOnly, stage]);

  async function handleSyncMap() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/sfusa-map-sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncResult(data.error || "Sync failed");
      } else {
        setSyncResult(
          `${data.onMap} of ${data.checked} on the SFUSA map (${data.changed} updated).` +
            (data.errors?.length ? ` Errors: ${data.errors.join("; ")}` : "")
        );
        await loadSnails();
      }
    } catch {
      setSyncResult("Sync failed");
    }
    setSyncing(false);
  }

  // Downloads the currently-filtered snails as an .xlsx. The server applies the
  // same filter as the list from these params, so the spreadsheet matches the
  // active tab and toggles. We fetch it as a blob (rather than navigating) so we
  // can show a spinner and surface a failure inline, and honor the filename the
  // server stamps into Content-Disposition.
  async function handleExport() {
    setExporting(true);
    setSyncResult(null);
    try {
      const res = await fetch(
        `/api/admin/export?${filterQuery(tab, mineOnly, notOnMapOnly, stage)}`
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        "snails-of-approval.xlsx";
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setSyncResult("Export failed");
    }
    setExporting(false);
  }

  async function handleSyncMailchimp() {
    setMcSyncing(true);
    setSyncResult(null);
    setMcReport(null);
    try {
      const res = await fetch("/api/admin/mailchimp/sync", { method: "POST" });
      const data = await res.json();
      setMcReport(
        res.ok ? data : { error: data.error || "Mailchimp sync failed" }
      );
    } catch {
      setMcReport({ error: "Mailchimp sync failed" });
    }
    setMcSyncing(false);
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/snails/${id}`, { method: "DELETE" });
    // Refetch so the table and the tab counts both reflect the deletion.
    await loadSnails();
  }

  const stageStages = stagesForTab(tab);

  const tabs: { key: Tab; label: string }[] = [
    { key: "leads", label: "Leads" },
    { key: "active", label: "Active" },
    { key: "lapsed", label: "Lapsed" },
    { key: "all", label: "All" },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Snails</h1>
        <div className="flex items-center gap-2">
          {/* Everyday actions: download exactly what's filtered, and add a snail. */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Download the snails in the current view as a spreadsheet"
          >
            <DownloadIcon />
            {exporting ? "Exporting…" : `Export view (${snails.length})`}
          </button>
          <Link
            href="/admin/snails/new"
            className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors shadow-sm"
          >
            + Add Snail
          </Link>

          {/* Occasional integrations — grouped out of the way. These run against
              the whole dataset, not the current view, so they live apart from
              the filter-aware Export above. */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="inline-flex items-center border border-gray-300 px-2.5 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <KebabIcon />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg z-10 py-1"
              >
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Integrations
                </p>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    handleSyncMap();
                  }}
                  disabled={syncing}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  title="Check each snail against the live Slow Food USA map"
                >
                  <RefreshIcon />
                  {syncing ? "Refreshing…" : "Refresh SFUSA status"}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    handleSyncMailchimp();
                  }}
                  disabled={mcSyncing}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  title="Push every contact to Mailchimp and refresh audience segments — ignores the current filter"
                >
                  <UploadIcon />
                  {mcSyncing ? "Syncing…" : "Sync all contacts to Mailchimp"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {syncResult && (
        <p className="mb-4 text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          {syncResult}
        </p>
      )}

      {mcReport && (
        <MailchimpReport report={mcReport} onClose={() => setMcReport(null)} />
      )}

      {/* Tabs + toggles, with the stage filter on a second row beneath them */}
      <div className="flex flex-col gap-3 mb-6">
      <div className="flex items-center gap-4 flex-wrap">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              // A stage from the old tab would filter the new one to nothing.
              setStage(null);
            }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
            <span
              className={`ml-1.5 text-xs ${
                tab === t.key ? "text-gray-500" : "text-gray-400"
              }`}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={mineOnly}
          onChange={(e) => setMineOnly(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-amber-700 focus:ring-amber-500"
        />
        My snails only
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={notOnMapOnly}
          onChange={(e) => setNotOnMapOnly(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-amber-700 focus:ring-amber-500"
        />
        Not on SFUSA map
      </label>
      </div>

      {/* Stage filter — only the tabs that map to a funnel get one. "Lapsed" is
          already a single stage and "All" spans both funnels. */}
      {stageStages.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter by stage">
          <button
            type="button"
            onClick={() => setStage(null)}
            aria-pressed={stage === null}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              stage === null
                ? "bg-amber-700 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            All stages
          </button>
          {stageStages.map((value) => {
            const count = stageCounts[value] ?? 0;
            const selected = stage === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStage(selected ? null : value)}
                aria-pressed={selected}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  selected
                    ? "bg-amber-700 text-white"
                    : count === 0
                      ? "bg-white text-gray-400 ring-1 ring-gray-200 hover:bg-gray-50"
                      : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                {stageLabel(value)}
                <span className={`ml-1.5 ${selected ? "text-amber-100" : "text-gray-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : snails.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="flex justify-center mb-4 text-gray-300">
            <SnailIcon size={48} />
          </div>
          <p className="text-gray-500">
            {/* Name the stage when one is selected, so an empty table reads as
                "nothing at this stage" rather than "nothing in this tab". */}
            {mineOnly
              ? "No snails assigned to you in this view."
              : stage
                ? `No ${tab} at ${stageLabel(stage)}.`
                : tab === "all"
                  ? "No snails yet. Create your first one!"
                  : `No ${tab} snails.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    SFUSA Category
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Assignee
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {snails.map((snail) => (
                  <tr
                    key={snail.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/snails/${snail.id}`}
                        className="text-amber-700 hover:text-amber-800 font-medium"
                      >
                        {snail.name}
                      </Link>
                      {snail.formerAwardee && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 ring-1 ring-orange-600/20">
                          Former
                        </span>
                      )}
                      {snail.onSfusaMap && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 ring-1 ring-green-600/20">
                          On map
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {snail.category ? (
                        <>
                          <span className="text-gray-400">{snail.category.parent?.name} &rsaquo; </span>
                          {snail.category.name}
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {snail.stage && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stageBadge[snail.stage] || "bg-gray-100 text-gray-600"}`}
                        >
                          {stageLabel(snail.stage)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {snail.assignee?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setCheckInFor(snail)}
                        className="text-amber-700 hover:text-amber-800 text-sm font-medium mr-4"
                      >
                        Check in
                      </button>
                      <button
                        onClick={() => handleDelete(snail.id, snail.name)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {checkInFor && (
        <CheckInModal
          snailId={checkInFor.id}
          snailName={checkInFor.name}
          onClose={() => setCheckInFor(null)}
        />
      )}
    </div>
  );
}

/* ── Mailchimp sync report ─────────────────────────────────────────────── */

type SyncIssue = { snail: string; value: string; reason?: string };
type McReport =
  | { error: string }
  | {
      schema?: { mergeFieldsCreated: string[]; segmentsCreated: string[] };
      considered: number;
      synced: number;
      skipped: number;
      duplicates: number;
      failed: number;
      invalidEmails: SyncIssue[];
      failures: SyncIssue[];
    };

const statTones: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-gray-100 text-gray-700",
};

function Stat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: keyof typeof statTones;
}) {
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-full px-2.5 py-0.5 ${statTones[tone]}`}
    >
      <span className="font-semibold">{value}</span>
      <span className="text-xs">{label}</span>
    </span>
  );
}

function IssueList({ issues, shown }: { issues: SyncIssue[]; shown: number }) {
  return (
    <>
      <ul className="mt-1 rounded-md border border-gray-200 bg-white divide-y divide-gray-100">
        {issues.map((it, i) => (
          <li key={i} className="px-3 py-1.5 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-gray-800 shrink-0">
                {it.snail}
              </span>
              <span className="font-mono text-xs text-gray-500 break-all">
                {it.value}
              </span>
            </div>
            {it.reason && (
              <span className="text-xs text-red-600">{it.reason}</span>
            )}
          </li>
        ))}
      </ul>
      {shown > issues.length && (
        <p className="mt-1 text-xs text-gray-400">
          + {shown - issues.length} more not shown
        </p>
      )}
    </>
  );
}

function MailchimpReport({
  report,
  onClose,
}: {
  report: McReport;
  onClose: () => void;
}) {
  if ("error" in report) {
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        Mailchimp sync failed: {report.error}
      </div>
    );
  }

  const created = [
    ...(report.schema?.mergeFieldsCreated ?? []),
    ...(report.schema?.segmentsCreated ?? []),
  ];

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Mailchimp sync · {report.synced} of {report.considered} contacts
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Stat value={report.synced} label="synced" tone="green" />
        {report.skipped > 0 && (
          <Stat value={report.skipped} label="skipped" tone="amber" />
        )}
        {report.duplicates > 0 && (
          <Stat value={report.duplicates} label="duplicates merged" tone="gray" />
        )}
        {report.failed > 0 && (
          <Stat value={report.failed} label="failed" tone="red" />
        )}
      </div>

      {created.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Set up in Mailchimp: {created.join(", ")}
        </p>
      )}

      {report.invalidEmails.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Skipped — invalid email
          </p>
          <IssueList issues={report.invalidEmails} shown={report.skipped} />
          <p className="mt-1 text-xs text-gray-500">
            Fix on the contact — one email address each; split multiple people
            into separate contacts.
          </p>
        </div>
      )}

      {report.failures.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
            Failed
          </p>
          <IssueList issues={report.failures} shown={report.failed} />
        </div>
      )}
    </div>
  );
}
