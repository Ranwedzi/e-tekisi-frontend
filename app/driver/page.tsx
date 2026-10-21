"use client";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import ChatModal from "../components/ChatModal";
import { Countdown } from "../components/Countdown";
import { FareDialog } from "../components/FareDialog";
import { useAuthedSession } from "../components/RequireAuth";
import { useConfirm, useToast } from "../components/Feedback";
import { AlertIcon, CalendarIcon, ChatIcon, PhoneIcon, QueueIcon } from "../components/Icons";
import { DriverNav, NotificationBell } from "../components/Nav";
import { Spinner } from "../components/Spinner";
import { ApiError, apiFetch, errorMessage, newIdempotencyKey } from "../lib/api";
import { usePolling } from "../lib/usePolling";
import { RatePrompt, ratingText } from "../components/RatePrompt";
import { AppPrompts } from "../components/AppPrompts";
import { directionsUrl, distanceKm, formatKm } from "../lib/distance";
import { useLivePolling } from "../lib/live";
import { useGeolocation } from "../lib/useGeolocation";
import type { Booking, Driver, TripCompletedResponse } from "../lib/types";
import { useLocale } from "../lib/i18n";
import { formatWhen } from "../lib/when";

const LiveMap = dynamic(() => import("../components/LiveMap"), { ssr: false });

export default function DriverDashboard() {
  const session = useAuthedSession();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tag } = useLocale();
  const { coords } = useGeolocation();

  const [driver, setDriver] = useState<Driver | null>(null);
  const [pending, setPending] = useState<Booking[]>([]);
  const [myTrips, setMyTrips] = useState<Booking[]>([]);
  const [fareFor, setFareFor] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const load = async () => {
    const [d, p, mine] = await Promise.all([
      apiFetch<Driver>(`/api/auth/driver/${session.userId}`),
      apiFetch<Booking[]>("/api/bookings/pending"), // already excludes trips this driver declined
      apiFetch<Booking[]>(`/api/bookings/driver/${session.userId}`),
    ]);
    setDriver(d);
    setPending(p);
    setMyTrips(mine);
  };
  useLivePolling(load, ["bookings", "pending", "notifications"], 5000);

  const isOnline = driver?.active ?? false;
  const hasValidCoords = Number.isFinite(coords[0]) && Number.isFinite(coords[1]) && (coords[0] !== 0 || coords[1] !== 0);

  // Share location every 10 s while online, so commuters see the taxi and safety checks can run.
  usePolling(
    () => apiFetch("/api/locations/update", { method: "POST", body: { lat: coords[0], lng: coords[1] } }),
    10_000,
    isOnline && hasValidCoords,
  );

  const activeTrips = myTrips.filter((b) => b.status === "ACCEPTED");
  const myOffers = myTrips.filter((b) => b.status === "OFFERED");

  const toggleOnline = async () => {
    if (!driver) return;
    setTogglingOnline(true);
    try {
      setDriver(await apiFetch<Driver>(`/api/auth/driver/${driver.id}/status`, { method: "PUT", query: { active: !isOnline } }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTogglingOnline(false);
    }
  };

  // The commuter is only charged once they accept this exact fare.
  const sendOffer = async (booking: Booking, fare: number) => {
    setBusy(true);
    try {
      const offered = await apiFetch<Booking>(`/api/bookings/${booking.id}/offer`, {
        method: "PUT",
        query: { fare },
        idempotencyKey: newIdempotencyKey(),
      });
      toast.success(
        t("driver.offerSent", {
          amount: ((offered.fare ?? 0) + (offered.tip ?? 0)).toFixed(2),
          name: offered.commuterName ?? t("driver.theCommuter"),
        }),
      );
      setFareFor(null);
    } catch (err) {
      if (err instanceof ApiError && err.code === "BOOKING_NOT_PENDING") {
        toast.error(t("driver.offerTaken"));
        setFareFor(null);
      } else if (err instanceof ApiError && err.code === "DRIVER_OFFLINE") {
        toast.error(t("driver.goOnlineToOffer"));
        setFareFor(null);
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setBusy(false);
      await load().catch(() => undefined);
    }
  };

  const decline = async (booking: Booking) => {
    setPending((list) => list.filter((b) => b.id !== booking.id));
    try {
      await apiFetch(`/api/bookings/${booking.id}/decline/${session.userId}`, { method: "POST" });
    } catch (err) {
      toast.error(errorMessage(err));
      await load().catch(() => undefined);
    }
  };

  const withdraw = async (offer: Booking) => {
    if (!(await confirm({ title: t("driver.withdrawTitle"), message: t("driver.withdrawMessage"), confirmLabel: t("driver.withdrawConfirm") }))) return;
    try {
      await apiFetch(`/api/bookings/${offer.id}/cancel`, { method: "PUT" });
      toast.success(t("driver.offerWithdrawn"));
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const complete = async (trip: Booking) => {
    if (!(await confirm({
        title: t("driver.completeTitle"),
        message: t("driver.completeMessage", { route: `${trip.pickupLocation} → ${trip.destination}` }),
        confirmLabel: t("driver.completeConfirm"),
      }))) return;
    try {
      const res = await apiFetch<TripCompletedResponse>(`/api/bookings/${trip.id}/complete/${session.userId}`, {
        method: "PUT",
        idempotencyKey: newIdempotencyKey(),
      });
      toast.success(t("driver.completed", { amount: res.earned.toFixed(2) }));
      setShowChat(false);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const progress = async (trip: Booking, step: "arrived" | "start") => {
    try {
      await apiFetch(`/api/bookings/${trip.id}/${step}`, { method: "PUT" });
      toast.success(step === "arrived" ? t("driver.arrivedToast") : t("driver.startedToast"));
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const cancel = async (trip: Booking) => {
    if (!(await confirm({
        title: t("driver.cancelTitle"),
        message: t("driver.cancelMessage"),
        confirmLabel: t("driver.cancelConfirm"),
        cancelLabel: t("driver.cancelKeep"),
        danger: true,
      }))) return;
    try {
      await apiFetch(`/api/bookings/${trip.id}/cancel`, { method: "PUT" });
      toast.success(t("driver.cancelled"));
      setShowChat(false);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const panic = async (trip: Booking) => {
    if (!(await confirm({ title: t("safety.panicTitle"), message: t("safety.panicMessage"), confirmLabel: t("safety.panicConfirm"), danger: true }))) return;
    try {
      await apiFetch("/api/agents/safety/panic", { method: "POST", query: { bookingId: trip.id } });
      toast.success(t("safety.panicSent"));
    } catch (err) {
      toast.error(t("safety.panicFailed", { error: errorMessage(err) }));
    }
  };

  if (!driver) return <Spinner dark />;
  const activeTrip = activeTrips[0] ?? null;

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white font-sans pb-44">
      <header className="p-6 bg-[#262626] rounded-b-[40px] shadow-xl flex items-center justify-between border-b border-[#333]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#FFD217] rounded-full flex items-center justify-center text-black font-black text-2xl border-4 border-[#333] uppercase">{driver.fullName.charAt(0)}</div>
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t("driver.partner")}</p>
            <h1 className="text-xl font-black">{driver.fullName}</h1>
          </div>
        </div>
        <NotificationBell dark />
      </header>

      <AppPrompts role="DRIVER" dark />

      <div className="p-4 h-80">
        <div className="relative h-full bg-[#262626] rounded-[40px] overflow-hidden border-4 border-[#333] shadow-2xl">
          <LiveMap center={coords} />
        </div>
      </div>

      <div className="px-6 pb-6">
        {driver.approvalStatus !== "APPROVED" && (
          <div role="status" className={`mb-4 p-5 rounded-[24px] border ${driver.approvalStatus === "REJECTED" ? "bg-red-950/60 border-red-800 text-red-200" : "bg-[#262626] border-[#FFD217]/40 text-gray-200"}`}>
            <p className="font-black text-sm">
              {driver.approvalStatus === "REJECTED" ? t("driver.notApproved") : t("driver.beingChecked")}
            </p>
            <p className="text-xs font-bold mt-1 opacity-80">
              {driver.approvalStatus === "REJECTED"
                ? driver.approvalNote ?? t("driver.contactSupport")
                : driver.approvalNote ?? t("driver.uploadDocs")}
            </p>
            {driver.approvalStatus === "PENDING_APPROVAL" && (
              <Link href="/driver/documents" className="inline-block mt-3 px-4 py-2 rounded-xl bg-[#FFD217] text-black font-black text-xs uppercase">
                {t("driver.myDocuments")}
              </Link>
            )}
          </div>
        )}
        <button
          onClick={toggleOnline}
          disabled={togglingOnline || driver.approvalStatus !== "APPROVED"}
          aria-pressed={isOnline}
          className={`w-full py-8 rounded-[32px] font-black text-2xl transition-all shadow-2xl border-4 disabled:opacity-70 ${isOnline ? "bg-green-600 border-green-400" : "bg-[#FFD217] border-[#e6bd15] text-black"}`}
        >
          <span className="uppercase">{isOnline ? t("driver.online") : t("driver.goOnline")}</span>
        </button>
        {isOnline && !hasValidCoords && (
          <p className="text-xs font-bold text-yellow-400 mt-3 text-center">{t("driver.allowLocation")}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 px-6 mb-6">
        <Link href="/driver/queue" className="bg-[#262626] p-6 rounded-[32px] border border-[#FFD217]/10 flex flex-col items-center gap-2 shadow-lg text-[#FFD217]">
          <QueueIcon />
          <p className="font-black text-[10px] uppercase tracking-widest">{t("nav.queue")}</p>
        </Link>
        <Link href="/driver/earnings" className="bg-[#262626] p-6 rounded-[32px] border border-[#FFD217]/10 flex flex-col items-center gap-2 shadow-lg text-[#FFD217]">
          <CalendarIcon />
          <p className="font-black text-[10px] uppercase tracking-widest">{t("nav.earnings")}</p>
        </Link>
      </div>

      {myOffers.length > 0 && (
        <section className="px-6 mb-8">
          <h3 className="font-black text-lg mb-4 uppercase tracking-tighter">{t("driver.yourOffers")}</h3>
          <div className="space-y-4">
            {myOffers.map((o) => (
              <div key={o.id} className="bg-[#262626] p-6 rounded-[32px] border-l-8 border-green-500 shadow-xl">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">{t("driver.waitingFor", { name: o.commuterName ?? t("driver.commuter") })}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <Countdown until={o.offerExpiresAt} expiredLabel={t("driver.expiring")} />
                  </p>
                </div>
                <p className="font-black text-lg leading-tight mb-1">
                  {o.pickupLocation} → {o.destination}
                </p>
                <p className="text-sm font-bold text-[#FFD217] mb-4">R{((o.fare ?? 0) + (o.tip ?? 0)).toFixed(2)}</p>
                <button onClick={() => withdraw(o)} className="w-full bg-[#333] text-gray-300 font-black py-3 rounded-2xl text-xs uppercase">
                  {t("driver.withdrawOffer")}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="px-6">
        <h3 className="font-black text-lg mb-4 uppercase tracking-tighter">{t("driver.incoming")}</h3>
        {!isOnline && <p className="text-sm font-bold text-gray-500 mb-4">{t("driver.goOnlineToStart")}</p>}
        <div className="space-y-4">
          {isOnline && pending.length === 0 && <p className="text-sm font-bold text-gray-500">{t("driver.noRequests")}</p>}
          {isOnline &&
            pending.map((b) => (
              <div key={b.id} className="bg-[#262626] p-6 rounded-[32px] border-l-8 border-[#FFD217] shadow-xl animate-in fade-in slide-in-from-bottom-4">
                {b.scheduledAt && <p className="text-xs font-bold text-yellow-400 mb-2">{t("driver.scheduled", { time: formatWhen(b.scheduledAt, tag) })}</p>}
                <p className="font-black text-lg leading-tight mb-1">
                  {b.pickupLocation} → {b.destination}
                </p>
                <p className="text-xs font-bold text-gray-400 mb-2">
                  {b.pickupLat != null && b.pickupLng != null && hasValidCoords
                    ? `${t("driver.away", { distance: formatKm(distanceKm([coords[0], coords[1]], [b.pickupLat, b.pickupLng])) })} · `
                    : ""}
                  {t("driver.commuterRating", { rating: ratingText(b.commuterRating, b.commuterRatingCount, t) })}
                </p>
                {b.tip ? <p className="text-xs font-bold text-green-400 mb-4">{t("driver.tip", { amount: b.tip.toFixed(2) })}</p> : <div className="mb-4" />}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setFareFor(b)} className="bg-white text-black font-black py-4 rounded-2xl text-xs uppercase shadow-lg">
                    {t("driver.offerFare")}
                  </button>
                  <button onClick={() => decline(b)} className="bg-[#333] text-gray-400 font-black py-4 rounded-2xl text-xs uppercase">
                    {t("home.decline")}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </section>

      {activeTrip && (
        <div className="fixed bottom-28 left-6 right-6 bg-white p-6 rounded-[32px] shadow-2xl border-2 border-[#FFD217] z-[2000] text-black animate-bounce-in">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">
                {t("driver.activeJob")}
                {activeTrips.length > 1 ? ` ${t("driver.oneOf", { count: activeTrips.length })}` : ""}
              </p>
              <h3 className="font-black text-lg">{activeTrip.commuterName ?? t("driver.commuter")}</h3>
              <p className="text-xs font-bold text-gray-400">
                {activeTrip.pickupLocation} → {activeTrip.destination} · R{((activeTrip.fare ?? 0) + (activeTrip.tip ?? 0)).toFixed(2)}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowChat(true)} aria-label={t("trip.chatWithCommuter")} className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition">
                <ChatIcon />
              </button>
              {activeTrip.commuterPhone && (
                <a href={`tel:${activeTrip.commuterPhone}`} aria-label={t("trip.callCommuter")} className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white active:scale-90 transition">
                  <PhoneIcon />
                </a>
              )}
            </div>
          </div>
          <a
            href={directionsUrl(activeTrip.pickupLat, activeTrip.pickupLng, activeTrip.pickupLocation)}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center w-full py-3 mb-2 bg-gray-100 font-black text-xs rounded-2xl uppercase tracking-widest"
          >
            {t("driver.directions")}
          </a>
          {!activeTrip.arrivedAt ? (
            <button onClick={() => progress(activeTrip, "arrived")} className="w-full py-4 bg-black text-[#FFD217] font-black text-xs rounded-2xl uppercase tracking-widest active:scale-95 transition">
              {t("driver.arrived")}
            </button>
          ) : !activeTrip.startedAt ? (
            <button onClick={() => progress(activeTrip, "start")} className="w-full py-4 bg-black text-[#FFD217] font-black text-xs rounded-2xl uppercase tracking-widest active:scale-95 transition">
              {t("driver.startTrip")}
            </button>
          ) : (
            <button onClick={() => complete(activeTrip)} className="w-full py-4 bg-black text-[#FFD217] font-black text-xs rounded-2xl uppercase tracking-widest active:scale-95 transition">
              {t("driver.completeTrip")}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => panic(activeTrip)} className="py-3 bg-red-600 text-white font-black text-[10px] rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2">
              <AlertIcon className="w-4 h-4" /> {t("safety.emergency")}
            </button>
            <button onClick={() => cancel(activeTrip)} className="py-3 bg-red-50 text-red-500 font-black text-[10px] rounded-2xl uppercase tracking-widest active:bg-red-100 transition">
              {t("driver.cancelJob")}
            </button>
          </div>
        </div>
      )}

      {fareFor && <FareDialog booking={fareFor} busy={busy} onSubmit={(fare) => sendOffer(fareFor, fare)} onCancel={() => setFareFor(null)} />}
      <RatePrompt trips={myTrips} role="DRIVER" onRated={() => void load()} />
      {showChat && activeTrip && <ChatModal bookingId={activeTrip.id} title={t("trip.chatWithCommuter")} onClose={() => setShowChat(false)} />}

      <DriverNav current="dashboard" />
    </div>
  );
}
