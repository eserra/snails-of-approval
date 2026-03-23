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
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Year Awarded *
          </label>
          <input
            type="number"
            required
            value={form.yearAwarded}
            onChange={(e) => update("yearAwarded", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chapter *
          </label>
          <select
            required
            value={form.chapterId}
            onChange={(e) => update("chapterId", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            required
            value={form.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="Will be geocoded automatically"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Latitude
          </label>
          <input
            value={form.latitude}
            onChange={(e) => update("latitude", e.target.value)}
            placeholder="Auto-filled from address"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Longitude
          </label>
          <input
            value={form.longitude}
            onChange={(e) => update("longitude", e.target.value)}
            placeholder="Auto-filled from address"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Facebook URL
          </label>
          <input
            type="url"
            value={form.facebookUrl}
            onChange={(e) => update("facebookUrl", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instagram URL
          </label>
          <input
            type="url"
            value={form.instagramUrl}
            onChange={(e) => update("instagramUrl", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : isEdit ? "Update" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/snails")}
          className="border border-gray-300 px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
