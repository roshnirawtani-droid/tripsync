import "server-only";

interface GeoapifyFeature {
  properties: {
    name?: string;
    address_line1?: string;
    distance?: number;
    categories?: string[];
  };
}

interface GeoapifyPlacesResponse {
  features: GeoapifyFeature[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: false } });
  if (!res.ok) throw new Error(`Geoapify request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

// Resolves a free-text destination name (e.g. "South Goa") to coordinates,
// used as the center point for both the attractions and stays lookups.
export async function geocodeDestination(
  destination: string,
  apiKey: string
): Promise<GeoPoint | null> {
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
    destination
  )}&limit=1&apiKey=${apiKey}`;
  const json = await fetchJson<{ features: { geometry: { coordinates: [number, number] } }[] }>(url);
  const feature = json.features?.[0];
  if (!feature) return null;
  const [lon, lat] = feature.geometry.coordinates;
  return { lat, lon };
}

const RADIUS_METERS = 15000;

export async function fetchAttractions(
  point: GeoPoint,
  apiKey: string
): Promise<{ name: string; kind: string }[]> {
  const url = `https://api.geoapify.com/v2/places?categories=tourism.sights,tourism.attraction,entertainment.culture&filter=circle:${point.lon},${point.lat},${RADIUS_METERS}&bias=proximity:${point.lon},${point.lat}&limit=6&apiKey=${apiKey}`;
  const json = await fetchJson<GeoapifyPlacesResponse>(url);
  return json.features
    .filter((f) => f.properties.name)
    .map((f) => ({
      name: f.properties.name as string,
      kind: f.properties.categories?.[0]?.split(".").pop() ?? "attraction",
    }));
}

export async function fetchStays(
  point: GeoPoint,
  apiKey: string
): Promise<{ name: string; distanceKm: number | null }[]> {
  const url = `https://api.geoapify.com/v2/places?categories=accommodation.hotel,accommodation.guest_house&filter=circle:${point.lon},${point.lat},${RADIUS_METERS}&bias=proximity:${point.lon},${point.lat}&limit=5&apiKey=${apiKey}`;
  const json = await fetchJson<GeoapifyPlacesResponse>(url);
  return json.features
    .filter((f) => f.properties.name)
    .map((f) => ({
      name: f.properties.name as string,
      distanceKm:
        typeof f.properties.distance === "number"
          ? Math.round((f.properties.distance / 1000) * 10) / 10
          : null,
    }));
}
