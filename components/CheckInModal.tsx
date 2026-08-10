"use client";

import { useEffect, useState } from "react";

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export type CheckIn = {
  id: number;
  visitedAt: string;
  partySize: number;
  occasion: string | null;
  amount: string | null;
  notes: string;
  createdAt: string;
  author: { name: string };
};

export default function CheckInModal({
  snailId,
  snailName,
  onClose,
  onCreated,
}: {
  snailId: number;
  snailName: string;
  onClose: () => void;
  onCreated?: (checkIn: CheckIn) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [visitedAt, setVisitedAt] = useState(today);
  const [partySize, setPartySize] = useState("1");
  const [occasion, setOccasion] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    notes.trim() !== "" && visitedAt !== "" && Number(partySize) >= 1;

  // Escape closes the modal, matching the backdrop click.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/snails/${snailId}/checkins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitedAt, partySize, occasion, amount, notes }),
    });
    if (res.ok) {
      const checkIn = await res.json();
      onCreated?.(checkIn);
      onClose();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error || "Could not save check-in.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-100 p-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Record a check-in</h2>
            <p className="text-xs text-gray-500 mt-0.5">{snailName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Visit date</label>
              <input type="date" value={visitedAt} max={today} onChange={(e) => setVisitedAt(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>People</label>
              <input type="number" min={1} value={partySize} onChange={(e) => setPartySize(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>
                Amount <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>
              Occasion <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input type="text" value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="e.g. dinner, chapter event" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did the visit go?" className={inputClass} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
            className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Record check-in"}
          </button>
        </div>
      </div>
    </div>
  );
}
