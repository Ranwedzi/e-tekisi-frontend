"use client";
import { useState } from "react";
import { apiFetch, errorMessage } from "../lib/api";
import type { Booking } from "../lib/types";
import { useToast } from "./Feedback";
import { useT, type T } from "../lib/i18n";

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
export function ratingText(average: number | null | undefined, count: number | null | undefined, t?: T): string {
  return average != null && count ? `★ ${average.toFixed(1)} (${count})` : t ? t("rating.new") : "New";
}

/**
 * After a completed trip, asks the commuter to rate the driver (or the driver
 * the commuter): once, within a week. "Not now" hides it on this device.
 */
export function RatePrompt({ trips, role, onRated }: { trips: Booking[]; role: "COMMUTER" | "DRIVER"; onRated: () => void }) {
  const toast = useToast();
  const t = useT();
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
  const other = role === "COMMUTER" ? (trip.driverName ?? t("rating.yourDriver")) : (trip.commuterName ?? t("rating.yourPassenger"));

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
      toast.success(t("rating.thanks"));
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
        <h2 id="rate-title" className="font-black text-lg">{t("rating.title", { name: other })}</h2>
        <p className="text-xs font-bold text-gray-400">
          {trip.pickupLocation} → {trip.destination}
        </p>
        <div className="flex justify-center gap-2 my-5" role="radiogroup" aria-label={t("rating.stars")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={stars === n}
              aria-label={n === 1 ? t("rating.oneStar") : t("rating.nStars", { count: n })}
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
          aria-label={t("rating.comment")}
          placeholder={t("rating.commentPlaceholder")}
          className="w-full p-3 rounded-2xl border border-gray-200 text-sm font-bold"
        />
        <div className="flex gap-2 mt-4">
          <button onClick={submit} disabled={busy || stars === 0} className="flex-1 py-3 rounded-2xl bg-black text-[#FFD217] font-black text-xs uppercase disabled:opacity-40">
            {busy ? t("common.sending") : t("rating.send")}
          </button>
          <button onClick={later} className="px-4 py-3 rounded-2xl bg-gray-100 font-black text-xs uppercase">
            {t("common.notNow")}
          </button>
        </div>
      </div>
    </div>
  );
}
