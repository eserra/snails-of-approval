"use client";

import { useEffect, useState } from "react";

type Chapter = {
  id: number;
  slug: string;
  name: string;
  state: string;
  _count: { snails: number };
};

export default function AdminChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/chapters")
      .then((res) => res.json())
      .then(setChapters)
      .finally(() => setLoading(false));
  }, []);

  function startEdit(ch: Chapter) {
    setEditId(ch.id);
    setName(ch.name);
    setState(ch.state);
    setShowForm(true);
  }

  function startNew() {
    setEditId(null);
    setName("");
    setState("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (editId) {
      await fetch(`/api/admin/chapters/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, state }),
      });
    } else {
      await fetch("/api/admin/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, state }),
      });
    }

    setShowForm(false);
    setSaving(false);
    setLoading(true);
    fetch("/api/chapters")
      .then((res) => res.json())
      .then(setChapters)
      .finally(() => setLoading(false));
  }

  async function handleDelete(id: number, chName: string) {
    if (!confirm(`Delete "${chName}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/chapters/${id}`, { method: "DELETE" });
    setChapters((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chapters</h1>
        <button
          onClick={startNew}
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors shadow-sm"
        >
          + Add Chapter
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            {editId ? "Edit Chapter" : "New Chapter"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., CA - San Francisco"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g., CA"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : editId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : chapters.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No chapters yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">State</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Snails</th>
                <th className="px-5 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {chapters.map((ch) => (
                <tr key={ch.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{ch.name}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {ch.state}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{ch._count.snails}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => startEdit(ch)}
                      className="text-amber-700 hover:text-amber-800 text-sm font-medium mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ch.id, ch.name)}
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
      )}
    </div>
  );
}
