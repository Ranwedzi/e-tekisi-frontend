"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuthedSession } from "../../components/RequireAuth";
import { BackIcon, PhoneIcon } from "../../components/Icons";
import { apiFetch, errorMessage } from "../../lib/api";
import { usePolling } from "../../lib/usePolling";
import type { Booking, BookingStatus } from "../../lib/types";

const STATUS_STYLE: Record<BookingStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  OFFERED: "bg-blue-50 text-blue-700",
  ACCEPTED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-50 text-red-500",
};

export default function HistoryPage() {
  const session = useAuthedSession();
  const [history, setHistory] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePolling(async () => {
    try {
      setHistory(await apiFetch<Booking[]>(`/api/bookings/user/${session.userId}`));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
      throw e;
    }
  }, 15_000);

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6 font-sans">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/profile" className="p-3 bg-white rounded-2xl shadow-sm" aria-label="Back">
          <BackIcon />
        </Link>
        <h1 className="text-2xl font-black">Trip History</h1>
      </div>

      {error && <p role="alert" className="p-4 mb-4 rounded-2xl bg-red-50 text-red-600 text-sm font-bold">{error}</p>}

      <div className="space-y-4">
        {history === null && !error && <p className="text-center py-20 text-gray-400 font-bold">Loading trips...</p>}
        {history?.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 font-bold">No trips found in your history.</p>
          </div>
        )}
        {history?.map((trip) => (
          <div key={trip.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${STATUS_STYLE[trip.status]}`}>{trip.status}</span>
              <p className="text-[10px] font-bold text-gray-400">{trip.scheduledTime?.replace("T", " ") ?? ""}</p>
            </div>
            <h3 className="font-black text-lg mb-2">
              {trip.pickupLocation} → {trip.destination}
            </h3>
            {trip.fare != null && <p className="text-sm font-bold text-gray-500 mb-4">Fare R{(trip.fare + (trip.tip ?? 0)).toFixed(2)}</p>}

            {trip.driverName && (
              <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold uppercase">{trip.driverName.charAt(0)}</div>
                  <div>
                    <p className="text-xs font-black">{trip.driverName}</p>
                    {trip.taxiPlate && <p className="text-[10px] text-gray-400 font-bold">Plate: {trip.taxiPlate}</p>}
                  </div>
                </div>
                {trip.driverPhone && trip.status === "ACCEPTED" && (
                  <a href={`tel:${trip.driverPhone}`} aria-label="Call driver" className="p-2 bg-green-500 rounded-full text-white">
                    <PhoneIcon className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
