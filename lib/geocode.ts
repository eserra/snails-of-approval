/**
 * The coordinate rule every location write shares: manual coordinates win;
 * when none were supplied, geocode the address; when that fails too, store
 * nulls (an admin can fill them in later).
 */
export async function resolveCoordinates(input: {
  address?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}): Promise<{ latitude: number | null; longitude: number | null }> {
  let latitude = input.latitude ? parseFloat(input.latitude) : null;
  let longitude = input.longitude ? parseFloat(input.longitude) : null;
  if (input.address && !latitude && !longitude) {
    const coords = await geocodeAddress(input.address);
    if (coords) ({ latitude, longitude } = coords);
  }
  return { latitude, longitude };
}

export async function geocodeAddress(
  address: string
): Promise<{ latitude: number; longitude: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "SnailsOfApproval/1.0" },
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.length) return null;

  return {
    latitude: parseFloat(data[0].lat),
    longitude: parseFloat(data[0].lon),
  };
}
