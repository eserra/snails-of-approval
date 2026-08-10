"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SnailDetail from "@/components/SnailDetail";
import CheckInModal from "@/components/CheckInModal";

export default function SnailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [snail, setSnail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const load = useCallback(() => {
    return fetch(`/api/admin/snails/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSnail(data);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!snail) return <p className="text-gray-500">Snail not found.</p>;

  const name = (snail as { name: string }).name;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
        <button
          type="button"
          onClick={() => setCheckingIn(true)}
          className="shrink-0 inline-flex items-center gap-1.5 bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Check in
        </button>
      </div>
      <SnailDetail snail={snail} />

      {checkingIn && (
        <CheckInModal
          snailId={parseInt(id)}
          snailName={name}
          onClose={() => setCheckingIn(false)}
          onCreated={() => load()}
        />
      )}
    </div>
  );
}
