/** Straight-line distance in km between two [lat, lng] points (haversine). */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "850 m" / "3.4 km" */
export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1)} km`;
}

/** A directions link that opens Google Maps (or the phone's maps app) at the pick-up. */
export function directionsUrl(lat: number | null | undefined, lng: number | null | undefined, address: string): string {
  const dest = lat != null && lng != null ? `${lat},${lng}` : address;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}
