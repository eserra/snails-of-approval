"use client";

import { useState } from "react";

export type EditFormProps = {
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
};

type Props = {
  title: string;
  snailId: number;
  children: React.ReactNode;
  EditForm: React.ComponentType<EditFormProps>;
};

export default function DetailSection({
  title,
  snailId,
  children,
  EditForm,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(fields: Record<string, unknown>) {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/snails/${snailId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditing(false);
    window.location.reload();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-amber-700 hover:text-amber-800 text-sm font-medium flex items-center gap-1"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
              />
            </svg>
            Edit
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          {error}
        </p>
      )}

      {editing ? (
        <EditForm
          onSave={handleSave}
          onCancel={() => {
            setEditing(false);
            setError("");
          }}
          saving={saving}
        />
      ) : (
        children
      )}
    </div>
  );
}
