"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { locationKindLabel } from "@/lib/location-kinds";

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

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function Map({ locations }: { locations: MapLocation[] }) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([39.8, -98.5], 4);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const markers = L.markerClusterGroup();

    locations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;
      const marker = L.marker(
        [parseFloat(loc.latitude), parseFloat(loc.longitude)],
        { icon: defaultIcon }
      );
      // Name the site only when it isn't the snail's main one, so single-location
      // snails read exactly as before.
      const site = loc.isPrimary
        ? ""
        : `<br/><span style="color:#666">${loc.label || locationKindLabel(loc.kind)}</span>`;
      marker.bindPopup(
        `<div>
          <strong><a href="/snails/${loc.slug}">${loc.name}</a></strong>${site}
          <br/><span style="color:#666">${loc.category?.name || ""} &middot; ${loc.chapter.name}</span>
          ${loc.address ? `<br/><span style="color:#999">${loc.address}</span>` : ""}
          ${loc.yearAwarded ? `<br/><span style="color:#999">Awarded ${loc.yearAwarded}</span>` : ""}
        </div>`
      );
      markers.addLayer(marker);
    });

    map.addLayer(markers);

    if (locations.length > 0) {
      const bounds = markers.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [locations]);

  return <div ref={containerRef} className="w-full h-full" />;
}
