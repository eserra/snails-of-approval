"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type Chapter = { id: number; name: string };
type Category = { id: number; name: string };

type SnailData = {
  id?: number;
  name: string;
  yearAwarded: number;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  email: string;
  phone: string;
  website: string;
  facebookUrl: string;
  instagramUrl: string;
  photoUrl: string;
  status: string;
  categoryId: string;
  chapterId: string;
};

const emptySnail: SnailData = {
  name: "",
  yearAwarded: new Date().getFullYear(),
  description: "",
  address: "",
  latitude: "",
  longitude: "",
  email: "",
  phone: "",
  website: "",
  facebookUrl: "",
  instagramUrl: "",
  photoUrl: "",
  status: "draft",
  categoryId: "",
  chapterId: "",
};

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function SnailForm({ snail }: { snail?: SnailData }) {
  const router = useRouter();
  const [form, setForm] = useState<SnailData>(snail || emptySnail);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!snail?.id;

  useEffect(() => {
    Promise.all([fetch("/api/chapters"), fetch("/api/categories")]).then(
      async ([chRes, catRes]) => {
        setChapters(await chRes.json());
        setCategories(await catRes.json());
      }
    );
  }, []);

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = isEdit ? `/api/admin/snails/${snail!.id}` : "/api/admin/snails";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }

    router.push("/admin/snails");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">Basic Info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Year Awarded *</label>
            <input
              type="number"
              required
              value={form.yearAwarded}
              onChange={(e) => update("yearAwarded", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Chapter *</label>
            <select
              required
              value={form.chapterId}
              onChange={(e) => update("chapterId", e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select chapter...</option>
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Category *</label>
            <select
              required
              value={form.categoryId}
              onChange={(e) => update("categoryId", e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">Location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Address</label>
            <input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Will be geocoded automatically"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Latitude</label>
            <input
              value={form.latitude}
              onChange={(e) => update("latitude", e.target.value)}
              placeholder="Auto-filled from address"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Longitude</label>
            <input
              value={form.longitude}
              onChange={(e) => update("longitude", e.target.value)}
              placeholder="Auto-filled from address"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">Contact & Links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Phone</label>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Facebook URL</label>
            <input
              type="url"
              value={form.facebookUrl}
              onChange={(e) => update("facebookUrl", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Instagram URL</label>
            <input
              type="url"
              value={form.instagramUrl}
              onChange={(e) => update("instagramUrl", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-amber-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50 shadow-sm"
        >
          {saving ? "Saving..." : isEdit ? "Update Snail" : "Create Snail"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/snails")}
          className="border border-gray-300 px-5 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
