"use client";
import { apiFetch } from "./api";
import type { LatLng } from "./types";

// The backend caches these too; this per-tab cache just saves a round trip
// while a trip card is being re-rendered.
const geocodeCache = new Map<string, LatLng>();

export async function geocodeLocation(query: string): Promise<LatLng | null> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  const cached = geocodeCache.get(normalized);
  if (cached) return cached;

  const data = await apiFetch<{ status: string; lat?: number; lng?: number }>("/api/geo/geocode", {
    query: { query: query.trim() },
  });
  if (data?.status !== "OK") return null;

  const lat = Number(data.lat);
  const lng = Number(data.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const coords: LatLng = [lat, lng];
  geocodeCache.set(normalized, coords);
  return coords;
}

export async function buildRoutePolyline(from: LatLng, to: LatLng): Promise<LatLng[]> {
  const data = await apiFetch<{ status: string; points?: [number, number][] }>("/api/geo/route", {
    query: { fromLat: from[0], fromLng: from[1], toLat: to[0], toLng: to[1] },
  });
  if (data?.status !== "OK" || !Array.isArray(data.points)) return [];

  return data.points
    .map((point): LatLng => [Number(point[0]), Number(point[1])])
    .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));
}
