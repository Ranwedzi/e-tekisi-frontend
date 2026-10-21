"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "../../components/Feedback";
import { BackIcon, ClockIcon } from "../../components/Icons";
import { geocodeLocation } from "../../lib/geo";
import { apiFetch, errorMessage, newIdempotencyKey } from "../../lib/api";
import type { CreateBookingResponse } from "../../lib/types";

export default function BookLater() {
  const router = useRouter();
  const toast = useToast();
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!pickupLocation.trim() || !destination.trim() || !scheduledTime) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (new Date(scheduledTime).getTime() < Date.now()) {
      toast.error("Choose a departure time in the future.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<CreateBookingResponse>("/api/bookings/create", {
        method: "POST",
        // The commuter is taken from the sign-in token, not sent here.
        body: await withCoords({ pickupLocation: pickupLocation.trim(), destination: destination.trim(), scheduledTime }),
        idempotencyKey: newIdempotencyKey(),
      });
      toast.success(res.message);
      router.push("/");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 font-sans">
      <div className="flex items-center justify-between mb-10">
        <Link href="/" className="p-3 bg-gray-50 rounded-2xl" aria-label="Back">
          <BackIcon />
        </Link>
        <h1 className="text-xl font-black">Schedule Trip</h1>
        <div className="w-12" />
      </div>

      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mb-4">
          <ClockIcon className="w-10 h-10" />
        </div>
        <p className="text-gray-400 font-bold text-center px-6">Book your taxi in advance.</p>
      </div>

      <form onSubmit={handleBooking} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="pickup" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Pick-up Location</label>
          <input
            id="pickup"
            className="w-full p-5 bg-gray-50 rounded-[24px] border border-gray-100 outline-none font-bold"
            placeholder="e.g. Bree Taxi Rank"
            maxLength={200}
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="destination" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Destination</label>
          <input
            id="destination"
            className="w-full p-5 bg-gray-50 rounded-[24px] border border-gray-100 outline-none font-bold"
            placeholder="e.g. Sandton City"
            maxLength={200}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="when" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Departure Time</label>
          <input
            id="when"
            type="datetime-local"
            className="w-full p-5 bg-gray-50 rounded-[24px] border border-gray-100 outline-none font-bold text-gray-600"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white font-black py-6 rounded-[24px] shadow-xl mt-10 active:scale-95 transition-transform disabled:opacity-60"
        >
          {loading ? "SAVING..." : "CONFIRM BOOKING"}
        </button>
      </form>
    </div>
  );
}

/** Adds geocoded coordinates when the addresses can be found (best effort). */
async function withCoords<T extends { pickupLocation: string; destination: string }>(body: T) {
  const [p, d] = await Promise.allSettled([geocodeLocation(body.pickupLocation), geocodeLocation(body.destination)]);
  const pick = p.status === "fulfilled" ? p.value : null;
  const dest = d.status === "fulfilled" ? d.value : null;
  return {
    ...body,
    ...(pick ? { pickupLat: pick[0], pickupLng: pick[1] } : {}),
    ...(dest ? { destinationLat: dest[0], destinationLng: dest[1] } : {}),
  };
}
