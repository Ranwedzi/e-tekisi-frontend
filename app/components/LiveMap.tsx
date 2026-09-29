"use client";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type LatLngTuple = [number, number];
type TaxiLocation = { driverId: string | number; lat: number; lng: number };

const taxiSvg = `
  <svg width="50" height="50" viewBox="0 0 100 100" aria-hidden="true">
    <ellipse cx="50" cy="85" rx="35" ry="10" fill="black" fill-opacity="0.2" />
    <path d="M15 50 L25 35 L85 35 L90 50 L90 75 L15 75 Z" fill="white" stroke="#333" stroke-width="1.5"/>
    <path d="M25 35 L45 35 L45 50 L15 50 Z" fill="#2C3E50" />
    <rect x="15" y="60" width="75" height="2" fill="#00529B" />
    <rect x="15" y="62" width="75" height="2" fill="#007A4D" />
    <rect x="15" y="64" width="75" height="2" fill="#E03C31" />
    <circle cx="30" cy="75" r="7" fill="#1A1A1A" stroke="white" stroke-width="2"/>
    <circle cx="75" cy="75" r="7" fill="#1A1A1A" stroke="white" stroke-width="2"/>
    <rect x="50" y="30" width="12" height="5" rx="1" fill="#FFD217" stroke="black" stroke-width="0.5"/>
  </svg>
`;

const userSvg = `
  <div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%"></div>
`;

const hasValidCoords = (coords?: LatLngTuple) =>
  Array.isArray(coords) &&
  coords.length === 2 &&
  Number.isFinite(coords[0]) &&
  Number.isFinite(coords[1]) &&
  (coords[0] !== 0 || coords[1] !== 0);

function MapController({ center, canFly }: { center: LatLngTuple; canFly: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (canFly) map.flyTo(center, 16);
  }, [center, canFly, map]);
  return (
    <div className="absolute bottom-6 right-6 z-[1000]">
      <button
        onClick={() => canFly && map.flyTo(center, 17)}
        disabled={!canFly}
        className="bg-black text-[#FFD217] p-4 rounded-3xl shadow-2xl border-2 border-[#333] active:scale-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
      </button>
    </div>
  );
}

export default function LiveMap({
  center,
  nearbyTaxis = [],
  routePath = [],
  fallbackCenter = [-25.75, 28.23],
  zoom = 13,
}: {
  center: LatLngTuple;
  nearbyTaxis?: TaxiLocation[];
  routePath?: LatLngTuple[];
  fallbackCenter?: LatLngTuple;
  zoom?: number;
}) {
  const canFly = hasValidCoords(center);
  const resolvedCenter = canFly ? center : fallbackCenter;
  const icons = useMemo(() => {
    if (typeof window === "undefined") return null;
    return {
      taxi: L.divIcon({
        html: taxiSvg,
        className: "taxi-marker",
        iconSize: [50, 50],
        iconAnchor: [25, 25],
      }),
      user: L.divIcon({
        html: userSvg,
        className: "u-dot",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    };
  }, []);

  const safeRoute = routePath.filter((point) => hasValidCoords(point));
  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={resolvedCenter}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        {safeRoute.length > 0 && <Polyline positions={safeRoute} color="#FFD217" weight={6} opacity={0.8} />}
        {canFly && icons?.user && <Marker position={center} icon={icons.user} />}
        {icons?.taxi &&
          nearbyTaxis
            .filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng))
            .map((t) => <Marker key={t.driverId} position={[t.lat, t.lng]} icon={icons.taxi} />)}
        <MapController center={resolvedCenter} canFly={canFly} />
      </MapContainer>
    </div>
  );
}
