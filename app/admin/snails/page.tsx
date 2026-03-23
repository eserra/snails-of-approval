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
          className="bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-800 transition-colors"
        >
          Add Snail
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : snails.length === 0 ? (
        <p className="text-gray-500">No snails yet. Create your first one!</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-3 font-medium text-gray-500">Name</th>
              <th className="pb-3 font-medium text-gray-500">Category</th>
              <th className="pb-3 font-medium text-gray-500">Chapter</th>
              <th className="pb-3 font-medium text-gray-500">Year</th>
              <th className="pb-3 font-medium text-gray-500">Status</th>
              <th className="pb-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {snails.map((snail) => (
              <tr key={snail.id} className="border-b border-gray-100">
                <td className="py-3">
                  <Link
                    href={`/admin/snails/${snail.id}`}
                    className="text-amber-700 hover:text-amber-800 font-medium"
                  >
                    {snail.name}
                  </Link>
                </td>
                <td className="py-3 text-gray-600">{snail.category.name}</td>
                <td className="py-3 text-gray-600">{snail.chapter.name}</td>
                <td className="py-3 text-gray-600">{snail.yearAwarded}</td>
                <td className="py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      snail.status === "published"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {snail.status}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => handleDelete(snail.id, snail.name)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
