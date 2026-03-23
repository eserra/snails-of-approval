"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SnailForm from "@/components/SnailForm";

export default function EditSnailPage() {
  const { id } = useParams<{ id: string }>();
  const [snail, setSnail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/snails/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSnail({
          ...data,
          yearAwarded: data.yearAwarded,
          categoryId: String(data.categoryId),
          chapterId: String(data.chapterId),
          description: data.description || "",
          address: data.address || "",
          latitude: data.latitude || "",
          longitude: data.longitude || "",
          email: data.email || "",
          phone: data.phone || "",
          website: data.website || "",
          facebookUrl: data.facebookUrl || "",
          instagramUrl: data.instagramUrl || "",
          photoUrl: data.photoUrl || "",
        });
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Snail</h1>
      {snail && <SnailForm snail={snail} />}
    </div>
  );
}
