"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Filters from "@/components/Filters";
import { useSearchParams } from "next/navigation";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

type MapSnail = {
  slug: string;
  name: string;
  latitude: string | null;
  longitude: string | null;
  yearAwarded: number;
  category: { name: string; slug: string };
  chapter: { name: string; slug: string };
};

function MapPage() {
  const searchParams = useSearchParams();
  const [snails, setSnails] = useState<MapSnail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/snails/map?${searchParams.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setSnails(data);
        setLoading(false);
      });
  }, [searchParams]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-4 bg-white border-b border-gray-200">
        <Filters />
        <p className="text-sm text-gray-500 mt-2">
          {loading ? "Loading..." : `${snails.length} locations`}
        </p>
      </div>
      <div className="flex-1">
        <Map snails={snails} />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <MapPage />
    </Suspense>
  );
}
