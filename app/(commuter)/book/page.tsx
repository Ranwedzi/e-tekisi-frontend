"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "../../components/Feedback";
import { BackIcon, ClockIcon } from "../../components/Icons";
import { geocodeLocation } from "../../lib/geo";
import { apiFetch, errorMessage, newIdempotencyKey } from "../../lib/api";
import type { CreateBookingResponse } from "../../lib/types";
import { formatWhen, toLocalInput } from "../../lib/when";
import { useLocale } from "../../lib/i18n";

export default function BookLater() {
  const router = useRouter();
  const toast = useToast();
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);
  const { t, tag } = useLocale();
  // The earliest and latest times the backend accepts (15 minutes to 14 days ahead).
  const [limits] = useState(() => ({ min: toLocalInput(Date.now() + 16 * 60_000), max: toLocalInput(Date.now() + 14 * 86_400_000) }));

  const handleBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!pickupLocation.trim() || !destination.trim() || !scheduledTime) {
      toast.error(t("book.fillAll"));
      return;
    }
    // datetime-local is the phone's own time; send it as an exact moment.
    const departure = new Date(scheduledTime);
    if (departure.getTime() < Date.now() + 15 * 60_000) {
      toast.error(departure.getTime() < Date.now() ? t("book.future") : t("book.tooSoon"));
      return;
    }
    if (departure.getTime() > Date.now() + 14 * 86_400_000) {
      toast.error(t("book.tooFar"));
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<CreateBookingResponse>("/api/bookings/create", {
        method: "POST",
        // The commuter is taken from the sign-in token, not sent here.
        body: await withCoords({ pickupLocation: pickupLocation.trim(), destination: destination.trim(), scheduledAt: departure.toISOString() }),
        idempotencyKey: newIdempotencyKey(),
      });
      toast.success(res.booking.scheduledAt ? t("book.booked", { when: formatWhen(res.booking.scheduledAt, tag) }) : res.message);
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
        <Link href="/" className="p-3 bg-gray-50 rounded-2xl" aria-label={t("common.backLabel")}>
          <BackIcon />
        </Link>
        <h1 className="text-xl font-black">{t("book.title")}</h1>
        <div className="w-12" />
      </div>

      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mb-4">
          <ClockIcon className="w-10 h-10" />
        </div>
        <p className="text-gray-400 font-bold text-center px-6">{t("book.intro")}</p>
      </div>

      <form onSubmit={handleBooking} noValidate className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="pickup" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t("book.pickup")}</label>
          <input
            id="pickup"
            className="w-full p-5 bg-gray-50 rounded-[24px] border border-gray-100 outline-none font-bold"
            placeholder={t("book.pickupExample")}
            maxLength={200}
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="destination" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t("home.destination")}</label>
          <input
            id="destination"
            className="w-full p-5 bg-gray-50 rounded-[24px] border border-gray-100 outline-none font-bold"
            placeholder={t("book.destinationExample")}
            maxLength={200}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="when" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t("book.when")}</label>
          <input
            id="when"
            type="datetime-local"
            className="w-full p-5 bg-gray-50 rounded-[24px] border border-gray-100 outline-none font-bold text-gray-600"
            min={limits.min}
            max={limits.max}
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
          />
        </div>

        <p className="text-[11px] font-bold text-gray-400 ml-2">{t("book.howItWorks")}</p>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white font-black py-6 rounded-[24px] shadow-xl mt-10 active:scale-95 transition-transform disabled:opacity-60"
        >
          {loading ? t("forgot.savingCaps") : t("book.confirm")}
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
