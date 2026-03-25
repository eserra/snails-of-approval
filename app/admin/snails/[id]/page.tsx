"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SnailDetail from "@/components/SnailDetail";

export default function SnailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [snail, setSnail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/snails/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSnail(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!snail) return <p className="text-gray-500">Snail not found.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {(snail as { name: string }).name}
      </h1>
      <SnailDetail snail={snail} />
    </div>
  );
}
