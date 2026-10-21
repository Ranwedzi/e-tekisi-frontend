"use client";
import { useState, type FormEvent } from "react";
import type { Booking } from "../lib/types";
import { useT } from "../lib/i18n";

const MAX_FARE = 1000; // matches the backend's tekisi.booking.max-fare default
const QUICK_FARES = [15, 20, 25, 30];

/** Asks the driver for the fare to offer. The commuter has to accept it before anything is charged. */
export function FareDialog({
  booking,
  busy,
  onSubmit,
  onCancel,
}: {
  booking: Booking;
  busy: boolean;
  onSubmit: (fare: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const fare = Number(value);
    if (!value || !Number.isFinite(fare) || fare <= 0) return setError(t("fare.aboveZero"));
    if (fare > MAX_FARE) return setError(t("fare.atMost", { max: MAX_FARE }));
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return setError(t("fare.decimals"));
    setError(null);
    onSubmit(fare);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[3000] flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="fare-title">
      <form onSubmit={submit} className="w-full max-w-sm bg-[#262626] text-white rounded-[32px] p-6 shadow-2xl border border-[#333]">
        <h2 id="fare-title" className="text-xl font-black mb-1">{t("fare.title")}</h2>
        <p className="text-sm font-bold text-gray-400 mb-6">
          {booking.pickupLocation} → {booking.destination}
          {booking.tip ? ` · ${t("fare.includesTip", { amount: booking.tip.toFixed(2) })}` : ""}
        </p>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {QUICK_FARES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setValue(String(f))}
              className={`py-3 rounded-xl font-black text-sm ${value === String(f) ? "bg-[#FFD217] text-black" : "bg-[#333] text-gray-300"}`}
            >
              R{f}
            </button>
          ))}
        </div>

        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-2" htmlFor="fare-input">
          {t("fare.label")}
        </label>
        <input
          id="fare-input"
          type="number"
          inputMode="decimal"
          min="1"
          max={MAX_FARE}
          step="0.01"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full p-5 bg-[#1A1A1A] rounded-2xl outline-none font-black text-2xl border border-[#333] focus:border-[#FFD217]"
          placeholder="0.00"
        />
        {error && <p role="alert" className="text-sm font-bold text-red-400 mt-2 ml-2">{error}</p>}
        <p className="text-[11px] font-bold text-gray-500 mt-3 ml-2">{t("fare.note")}</p>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button type="button" onClick={onCancel} className="py-4 rounded-2xl bg-[#333] font-black text-xs uppercase tracking-widest">
            {t("common.back")}
          </button>
          <button type="submit" disabled={busy} className="py-4 rounded-2xl bg-[#FFD217] text-black font-black text-xs uppercase tracking-widest disabled:opacity-60">
            {busy ? t("common.sending") : t("fare.send")}
          </button>
        </div>
      </form>
    </div>
  );
}
