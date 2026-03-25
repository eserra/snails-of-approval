"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

type MapSnail = {
  slug: string;
  name: string;
  latitude: string | null;
  longitude: string | null;
  yearAwarded: number;
  category: { name: string; slug: string };
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

export default function Map({ snails }: { snails: MapSnail[] }) {
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

    snails.forEach((snail) => {
      if (!snail.latitude || !snail.longitude) return;
      const marker = L.marker(
        [parseFloat(snail.latitude), parseFloat(snail.longitude)],
        { icon: defaultIcon }
      );
      marker.bindPopup(
        `<div>
          <strong><a href="/snails/${snail.slug}">${snail.name}</a></strong>
          <br/><span style="color:#666">${snail.category?.name || ""} &middot; ${snail.chapter.name}</span>
          ${snail.yearAwarded ? `<br/><span style="color:#999">Awarded ${snail.yearAwarded}</span>` : ""}
        </div>`
      );
      markers.addLayer(marker);
    });

    map.addLayer(markers);

    if (snails.length > 0) {
      const bounds = markers.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [snails]);

  return <div ref={containerRef} className="w-full h-full" />;
}
