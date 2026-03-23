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
    loadChapters();
  }, []);

  async function loadChapters() {
    const res = await fetch("/api/chapters");
    setChapters(await res.json());
    setLoading(false);
  }

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
    loadChapters();
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
          className="bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-800 transition-colors"
        >
          Add Chapter
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., CA - San Francisco"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <input
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g., CA"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-amber-700 text-white px-4 py-2 rounded-md text-sm hover:bg-amber-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-gray-300 px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : chapters.length === 0 ? (
        <p className="text-gray-500">No chapters yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-3 font-medium text-gray-500">Name</th>
              <th className="pb-3 font-medium text-gray-500">State</th>
              <th className="pb-3 font-medium text-gray-500">Snails</th>
              <th className="pb-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((ch) => (
              <tr key={ch.id} className="border-b border-gray-100">
                <td className="py-3 font-medium text-gray-900">{ch.name}</td>
                <td className="py-3 text-gray-600">{ch.state}</td>
                <td className="py-3 text-gray-600">{ch._count.snails}</td>
                <td className="py-3 text-right space-x-3">
                  <button
                    onClick={() => startEdit(ch)}
                    className="text-amber-700 hover:text-amber-800 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ch.id, ch.name)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
