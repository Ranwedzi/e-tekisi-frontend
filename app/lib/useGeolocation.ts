"use client";
import { useEffect, useState } from "react";

type LatLngTuple = [number, number];

const DEFAULT_COORDS: LatLngTuple = [0, 0];

export function useGeolocation() {
  const [coords, setCoords] = useState<LatLngTuple>(DEFAULT_COORDS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords([pos.coords.latitude, pos.coords.longitude]);
        setError(null);
      },
      (err) => {
        setError(err.message || "Failed to fetch location");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { coords, error };
}
