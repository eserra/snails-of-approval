"use client";

import { useEffect, useState } from "react";

type Category = {
  id: number;
  slug: string;
  name: string;
  parentId: number | null;
  parent: { id: number; name: string } | null;
  children: { id: number; name: string; slug: string }[];
  _count: { snails: number };
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);

  function loadCategories() {
    fetch("/api/categories")
      .then((res) => res.json())
      .then(setCategories)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCategories();
  }, []);

  // Top-level categories (no parent)
  const topLevel = categories.filter((c) => !c.parentId);

  // Get children for a parent
  function childrenOf(id: number) {
    return categories.filter((c) => c.parentId === id);
  }

  // Categories that can be parents (only top-level, exclude self when editing)
  const parentOptions = topLevel.filter((c) => c.id !== editId);

  function startEdit(cat: Category) {
    setEditId(cat.id);
    setName(cat.name);
    setParentId(cat.parentId ? String(cat.parentId) : "");
    setShowForm(true);
  }

  function startNew() {
    setEditId(null);
    setName("");
    setParentId("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body = { name, parentId: parentId || null };

    if (editId) {
      await fetch(`/api/admin/categories/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors shadow-sm"
        >
          + Add Category
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            {editId ? "Edit Category" : "New Category"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Brewery"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                >
                  <option value="">None (top-level)</option>
                  {parentOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
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
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No categories yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevel.map((parent) => {
            const children = childrenOf(parent.id);
            return (
              <div
                key={parent.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Parent row */}
                <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">
                      {parent.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {parent._count.snails} direct &middot;{" "}
                      {children.reduce((sum, c) => sum + c._count.snails, 0) +
                        parent._count.snails}{" "}
                      total
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => startEdit(parent)}
                      className="text-amber-700 hover:text-amber-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    {children.length === 0 && parent._count.snails === 0 && (
                      <button
                        onClick={() => handleDelete(parent.id, parent.name)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Children */}
                {children.length > 0 && (
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {children.map((child) => (
                        <tr
                          key={child.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-5 py-3 pl-10 text-gray-700">
                            <span className="text-gray-300 mr-2">└</span>
                            {child.name}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {child._count.snails} snails
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => startEdit(child)}
                              className="text-amber-700 hover:text-amber-800 text-sm font-medium mr-4"
                            >
                              Edit
                            </button>
                            {child._count.snails === 0 && (
                              <button
                                onClick={() =>
                                  handleDelete(child.id, child.name)
                                }
                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {children.length === 0 && (
                  <div className="px-5 py-3 text-sm text-gray-400 italic">
                    No sub-categories
                  </div>
                )}
              </div>
            );
          })}

          {/* Orphans — categories with a parentId that points to a non-top-level parent */}
          {categories.filter(
            (c) =>
              c.parentId && !topLevel.some((t) => t.id === c.parentId)
          ).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <span className="font-semibold text-gray-500">
                  Uncategorized
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {categories
                    .filter(
                      (c) =>
                        c.parentId &&
                        !topLevel.some((t) => t.id === c.parentId)
                    )
                    .map((cat) => (
                      <tr
                        key={cat.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-5 py-3 text-gray-700">{cat.name}</td>
                        <td className="px-5 py-3 text-gray-500">
                          {cat._count.snails} snails
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => startEdit(cat)}
                            className="text-amber-700 hover:text-amber-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
