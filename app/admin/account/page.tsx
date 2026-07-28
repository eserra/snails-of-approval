"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function AccountPage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (newPassword !== confirm) {
      setMsg({ ok: false, text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setMsg({ ok: false, text: "New password must be at least 8 characters." });
      return;
    }

    setSaving(true);
    const res = await fetch("/api/admin/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ ok: true, text: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } else {
      setMsg({ ok: false, text: data.error || "Something went wrong." });
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Account</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Signed in as {session?.user?.email}
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-gray-900">Change password</h2>

        <div>
          <label htmlFor="current" className={labelClass}>
            Current password
          </label>
          <input
            id="current"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label htmlFor="new" className={labelClass}>
            New password
          </label>
          <input
            id="new"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            required
          />
          <p className="mt-1 text-xs text-gray-400">At least 8 characters.</p>
        </div>

        <div>
          <label htmlFor="confirm" className={labelClass}>
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        {msg && (
          <p
            className={`text-sm rounded-lg px-3 py-2 ${
              msg.ok
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {msg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
