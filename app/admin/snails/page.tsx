"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import SnailIcon from "@/components/SnailIcon";

type Snail = {
  id: number;
  name: string;
  slug: string;
  status: string;
  track: string;
  stage: string | null;
  formerAwardee: boolean;
  establishmentType: string | null;
  assigneeId: number | null;
  chapter: { name: string };
  category: { name: string; parent: { name: string } | null } | null;
  assignee: { name: string } | null;
};

type Tab = "leads" | "active" | "lapsed" | "all";

const stageBadge: Record<string, string> = {
  New: "bg-gray-100 text-gray-600 ring-1 ring-gray-500/10",
  Contacted: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  Applied: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
  Visited: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20",
  Voted: "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20",
  Onboarding: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-600/20",
  Active: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
  "Renewal Due": "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  "Renewal Submitted": "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
  Lapsed: "bg-gray-100 text-gray-600 ring-1 ring-gray-500/10",
  Blocked: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
};

function matchesTab(snail: Snail, tab: Tab) {
  switch (tab) {
    case "active":
      return snail.track === "active";
    case "leads":
      return snail.track === "lead" && snail.stage !== "Lapsed";
    case "lapsed":
      return snail.track === "lead" && snail.formerAwardee && snail.stage === "Lapsed";
    default:
      return true;
  }
}

export default function AdminSnailsPage() {
  const { data: session } = useSession();
  const [snails, setSnails] = useState<Snail[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("leads");
  const [mineOnly, setMineOnly] = useState(false);

  useEffect(() => {
    fetch("/api/admin/snails")
      .then((r) => r.json())
      .then((data) => {
        setSnails(data);
        setLoading(false);
      });
  }, []);

  const userId = session?.user?.id;
  const filtered = snails
    .filter((s) => matchesTab(s, tab))
    .filter((s) => !mineOnly || (userId && String(s.assigneeId) === userId));

  const counts = {
    leads: snails.filter((s) => s.track === "lead" && s.stage !== "Lapsed").length,
    active: snails.filter((s) => s.track === "active").length,
    lapsed: snails.filter(
      (s) => s.track === "lead" && s.formerAwardee && s.stage === "Lapsed"
    ).length,
    all: snails.length,
  };

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/snails/${id}`, { method: "DELETE" });
    setSnails((prev) => prev.filter((s) => s.id !== id));
  }

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
        <Link
          href="/admin/snails/new"
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors shadow-sm"
        >
          + Add Snail
        </Link>
      </div>

      {/* Tabs + My Snails toggle */}
      <div className="flex items-center gap-4 mb-6">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
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
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="flex justify-center mb-4 text-gray-300">
            <SnailIcon size={48} />
          </div>
          <p className="text-gray-500">
            {mineOnly
              ? "No snails assigned to you in this view."
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
                    SFNYC Legacy
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
                {filtered.map((snail) => (
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
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {snail.category ? (
                        <>
                          <span className="text-gray-400">{snail.category.parent?.name} &rsaquo; </span>
                          {snail.category.name}
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {snail.establishmentType || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {snail.stage && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stageBadge[snail.stage] || "bg-gray-100 text-gray-600"}`}
                        >
                          {snail.stage}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {snail.assignee?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/snails/${snail.id}`}
                        className="text-amber-700 hover:text-amber-800 text-sm font-medium mr-4"
                      >
                        Edit
                      </Link>
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
    </div>
  );
}
