"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Filters from "@/components/Filters";
import { useSearchParams } from "next/navigation";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

// One entry per public location, so a snail with several locations has several markers.
type MapLocation = {
  id: number;
  kind: string;
  label: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  isPrimary: boolean;
  slug: string;
  name: string;
  yearAwarded: number;
  category: { name: string; slug: string } | null;
  chapter: { name: string; slug: string };
};

function MapPage() {
  const searchParams = useSearchParams();
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/snails/map?${searchParams.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setLocations(data);
        setLoading(false);
      });
  }, [searchParams]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-4 bg-white border-b border-gray-200">
        <Filters />
        <p className="text-sm text-gray-500 mt-2">
          {loading ? "Loading..." : `${locations.length} locations`}
        </p>
      </div>
      <div className="flex-1">
        <Map locations={locations} />
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
