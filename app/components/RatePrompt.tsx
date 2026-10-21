"use client";
import { useState } from "react";
import { apiFetch, errorMessage } from "../lib/api";
import type { Booking } from "../lib/types";
import { useToast } from "./Feedback";

const WINDOW_MS = 7 * 24 * 3600 * 1000;
const DISMISSED_KEY = "etekisi_rating_dismissed";

function dismissed(): number[] {
  try {
    return JSON.parse(window.localStorage.getItem(DISMISSED_KEY) ?? "[]") as number[];
  } catch {
    return [];
  }
}

function dismiss(id: number) {
  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed(), id].slice(-50)));
  } catch {
    // storage blocked: the prompt just comes back next time
  }
}

/** "★ 4.6 (23)" or "New" for someone without ratings yet. */
export function ratingText(average: number | null | undefined, count: number | null | undefined): string {
  return average != null && count ? `★ ${average.toFixed(1)} (${count})` : "New";
}

/**
 * After a completed trip, asks the commuter to rate the driver (or the driver
 * the commuter): once, within a week. "Not now" hides it on this device.
 */
export function RatePrompt({ trips, role, onRated }: { trips: Booking[]; role: "COMMUTER" | "DRIVER"; onRated: () => void }) {
  const toast = useToast();
  const [hidden, setHidden] = useState<number[]>(() => (typeof window === "undefined" ? [] : dismissed()));
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  const trip = trips.find(
    (b) =>
      b.status === "COMPLETED" &&
      !(role === "COMMUTER" ? b.commuterRated : b.driverRated) &&
      b.completedAt != null &&
      now - new Date(b.completedAt).getTime() < WINDOW_MS &&
      !hidden.includes(b.id),
  );
  if (!trip) return null;
  const other = role === "COMMUTER" ? (trip.driverName ?? "your driver") : (trip.commuterName ?? "your passenger");

  const later = () => {
    dismiss(trip.id);
    setHidden((h) => [...h, trip.id]);
    setStars(0);
    setComment("");
  };

  const submit = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/bookings/${trip.id}/rating`, { method: "POST", body: { stars, comment: comment.trim() || null } });
      toast.success("Thanks for your rating.");
      setStars(0);
      setComment("");
      onRated();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[3000] flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="rate-title">
      <div className="w-full max-w-sm bg-white rounded-[32px] p-6 text-black">
        <h2 id="rate-title" className="font-black text-lg">How was your trip with {other}?</h2>
        <p className="text-xs font-bold text-gray-400">
          {trip.pickupLocation} → {trip.destination}
        </p>
        <div className="flex justify-center gap-2 my-5" role="radiogroup" aria-label="Stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={stars === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setStars(n)}
              className={`text-4xl leading-none transition ${n <= stars ? "text-[#FFB800]" : "text-gray-200"}`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={300}
          rows={2}
          aria-label="Comment (optional)"
          placeholder="Anything to add? (optional)"
          className="w-full p-3 rounded-2xl border border-gray-200 text-sm font-bold"
        />
        <div className="flex gap-2 mt-4">
          <button onClick={submit} disabled={busy || stars === 0} className="flex-1 py-3 rounded-2xl bg-black text-[#FFD217] font-black text-xs uppercase disabled:opacity-40">
            {busy ? "Sending…" : "Send rating"}
          </button>
          <button onClick={later} className="px-4 py-3 rounded-2xl bg-gray-100 font-black text-xs uppercase">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
