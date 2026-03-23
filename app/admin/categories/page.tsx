"use client";

import { useEffect, useState } from "react";

type Category = {
  id: number;
  slug: string;
  name: string;
  _count: { snails: number };
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
    setLoading(false);
  }

  function startEdit(cat: Category) {
    setEditId(cat.id);
    setName(cat.name);
    setShowForm(true);
  }

  function startNew() {
    setEditId(null);
    setName("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (editId) {
      await fetch(`/api/admin/categories/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } else {
      await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }

    setShowForm(false);
    setSaving(false);
    setLoading(true);
    loadCategories();
  }

  async function handleDelete(id: number, catName: string) {
    if (!confirm(`Delete "${catName}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button
          onClick={startNew}
          className="bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-800 transition-colors"
        >
          Add Category
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Brewery"
              className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
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
      ) : categories.length === 0 ? (
        <p className="text-gray-500">No categories yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-3 font-medium text-gray-500">Name</th>
              <th className="pb-3 font-medium text-gray-500">Snails</th>
              <th className="pb-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b border-gray-100">
                <td className="py-3 font-medium text-gray-900">{cat.name}</td>
                <td className="py-3 text-gray-600">{cat._count.snails}</td>
                <td className="py-3 text-right space-x-3">
                  <button
                    onClick={() => startEdit(cat)}
                    className="text-amber-700 hover:text-amber-800 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
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
