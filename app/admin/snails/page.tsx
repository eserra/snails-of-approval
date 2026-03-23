"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Snail = {
  id: number;
  name: string;
  slug: string;
  status: string;
  yearAwarded: number;
  chapter: { name: string };
  category: { name: string };
};

export default function AdminSnailsPage() {
  const [snails, setSnails] = useState<Snail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/snails")
      .then((r) => r.json())
      .then((data) => {
        setSnails(data);
        setLoading(false);
      });
  }, []);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/snails/${id}`, { method: "DELETE" });
    setSnails((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Snails</h1>
        <Link
          href="/admin/snails/new"
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors shadow-sm"
        >
          + Add Snail
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : snails.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">No snails yet. Create your first one!</p>
          <Link
            href="/admin/snails/new"
            className="text-amber-700 hover:text-amber-800 font-medium text-sm"
          >
            + Add Snail
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Category</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Chapter</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Year</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {snails.map((snail) => (
                  <tr key={snail.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/snails/${snail.id}`}
                        className="text-amber-700 hover:text-amber-800 font-medium"
                      >
                        {snail.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{snail.category.name}</td>
                    <td className="px-5 py-3.5 text-gray-600">{snail.chapter.name}</td>
                    <td className="px-5 py-3.5 text-gray-600">{snail.yearAwarded}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          snail.status === "published"
                            ? "bg-green-50 text-green-700 ring-1 ring-green-600/20"
                            : "bg-gray-100 text-gray-600 ring-1 ring-gray-500/10"
                        }`}
                      >
                        {snail.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
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
