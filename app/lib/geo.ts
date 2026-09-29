"use client";

type LatLngTuple = [number, number];

const geocodeCache = new Map<string, LatLngTuple>();

export async function geocodeLocation(query: string): Promise<LatLngTuple | null> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  const cached = geocodeCache.get(normalized);
  if (cached) return cached;

  const res = await fetch(`http://localhost:8080/api/geo/geocode?query=${encodeURIComponent(query)}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.status !== "OK") return null;

  const lat = Number.parseFloat(String(data.lat));
  const lng = Number.parseFloat(String(data.lng));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const coords: LatLngTuple = [lat, lng];
  geocodeCache.set(normalized, coords);
  return coords;
}

export async function buildRoutePolyline(from: LatLngTuple, to: LatLngTuple): Promise<LatLngTuple[]> {
  const res = await fetch(
    `http://localhost:8080/api/geo/route?fromLat=${from[0]}&fromLng=${from[1]}&toLat=${to[0]}&toLng=${to[1]}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (data?.status !== "OK" || !Array.isArray(data.points)) return [];

  return data.points
    .map((point: [number, number]) => [Number(point[0]), Number(point[1])] as LatLngTuple)
    .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));
}
