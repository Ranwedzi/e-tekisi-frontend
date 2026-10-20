"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { TaxiIcon } from "../../components/Icons";
import { Spinner } from "../../components/Spinner";
import { ApiError, apiFetch } from "../../lib/api";
import { usePolling } from "../../lib/usePolling";

const LiveMap = dynamic(() => import("../../components/LiveMap"), { ssr: false });

interface SharedTrip {
  status: "IN_PROGRESS" | "COMPLETED" | "ENDED";
  commuterFirstName: string | null;
  pickup: string;
  destination: string;
  expiresAt: string;
  driverFirstName?: string | null;
  taxiPlate?: string;
  taxiPosition?: { lat: number; lng: number; updatedAt: string | null; stale: boolean };
}

/** Opened by someone a commuter shared their trip with. No sign-in: the link is the key. */
export default function SharedTripPage() {
  const { token } = useParams<{ token: string }>();
  const [trip, setTrip] = useState<SharedTrip | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [gone, setGone] = useState(false);

  usePolling(
    async () => {
      try {
        setTrip(await apiFetch<SharedTrip>(`/api/share/${encodeURIComponent(token)}`, { auth: false }));
        setFetchedAt(Date.now());
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) setGone(true);
        else throw e;
      }
    },
    10_000,
    !gone && trip?.status !== "COMPLETED" && trip?.status !== "ENDED",
  );

  if (gone) {
    return (
      <Shell>
        <h1 className="text-2xl font-black">This link has stopped working</h1>
        <p className="text-sm font-bold text-gray-500 mt-2">
          The trip was finished, the link expired, or the person who shared it stopped sharing.
        </p>
      </Shell>
    );
  }
  if (!trip) return <Spinner label="Loading the trip" />;

  const who = trip.commuterFirstName ? `${trip.commuterFirstName}'s` : "A";
  if (trip.status !== "IN_PROGRESS") {
    return (
      <Shell>
        <h1 className="text-2xl font-black">{trip.status === "COMPLETED" ? `${who} trip is finished` : `${who} trip has ended`}</h1>
        <p className="text-sm font-bold text-gray-500 mt-2">
          {trip.pickup} → {trip.destination}
        </p>
      </Shell>
    );
  }

  const pos = trip.taxiPosition;
  const minutesAgo = pos?.updatedAt ? Math.max(0, Math.round((fetchedAt - new Date(pos.updatedAt).getTime()) / 60000)) : null;
  return (
    <Shell>
      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-700">Live trip</p>
      <h1 className="text-2xl font-black">{who} taxi</h1>
      <p className="text-sm font-bold text-gray-500">
        {trip.pickup} → {trip.destination}
      </p>
      <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Taxi</p>
        <p className="font-mono font-black text-2xl tracking-widest">{trip.taxiPlate ?? "—"}</p>
        {trip.driverFirstName && <p className="text-sm font-bold text-gray-600">Driver: {trip.driverFirstName}</p>}
      </div>
      <div className="mt-4 h-72 rounded-3xl overflow-hidden border border-gray-200">
        {pos ? (
          <LiveMap center={[pos.lat, pos.lng]} nearbyTaxis={[{ lat: pos.lat, lng: pos.lng }]} zoom={15} />
        ) : (
          <p className="p-6 text-sm font-bold text-gray-400">The taxi&apos;s position isn&apos;t available yet.</p>
        )}
      </div>
      {pos && (
        <p className={`text-xs font-bold mt-2 ${pos.stale ? "text-red-600" : "text-gray-400"}`} role="status">
          {pos.stale
            ? `No update from the taxi for ${minutesAgo ?? "several"} minutes. If you are worried, call them, or 10111 / 112.`
            : `Updated ${minutesAgo === 0 ? "just now" : `${minutesAgo} min ago`}. This page refreshes by itself.`}
        </p>
      )}
      <p className="text-[11px] font-bold text-gray-400 mt-6">
        Shared with you through e-Tekisi. The link stops working when the trip ends, or at{" "}
        {new Date(trip.expiresAt).toLocaleString()}.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-[#FFD217] rounded-full flex items-center justify-center text-black">
            <TaxiIcon className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="font-black">e-Tekisi</span>
        </div>
        {children}
      </div>
    </main>
  );
}
