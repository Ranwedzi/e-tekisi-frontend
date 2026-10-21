"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import ChatModal from "../components/ChatModal";
import { Countdown } from "../components/Countdown";
import { useAuthedSession } from "../components/RequireAuth";
import { useConfirm, useToast } from "../components/Feedback";
import { AlertIcon, ChatIcon, PhoneIcon } from "../components/Icons";
import { CommuterNav, NotificationBell } from "../components/Nav";
import { ApiError, apiFetch, errorMessage, newIdempotencyKey } from "../lib/api";
import { buildRoutePolyline, geocodeLocation } from "../lib/geo";
import { RatePrompt, ratingText } from "../components/RatePrompt";
import { AppPrompts } from "../components/AppPrompts";
import { usePolling } from "../lib/usePolling";
import { useLivePolling } from "../lib/live";
import { formatWhen } from "../lib/when";
import { useGeolocation } from "../lib/useGeolocation";
import type { Booking, Commuter, CreateBookingResponse, LatLng, NearbyTaxi, Wallet } from "../lib/types";
import { useLocale } from "../lib/i18n";

const LiveMap = dynamic(() => import("../components/LiveMap"), { ssr: false });

type RouteState = { key: string; path: LatLng[]; failed: boolean };

const DISMISSED_EXPIRED = "etekisi_expired_dismissed";

function readDismissed(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(DISMISSED_EXPIRED) ?? "[]") as number[];
  } catch {
    return [];
  }
}

export default function Home() {
  const session = useAuthedSession();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tag } = useLocale();
  const { coords } = useGeolocation();

  const [user, setUser] = useState<Commuter | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nearbyTaxis, setNearbyTaxis] = useState<NearbyTaxi[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [route, setRoute] = useState<RouteState | null>(null);

  const load = async () => {
    const [u, b, w] = await Promise.all([
      apiFetch<Commuter>(`/api/auth/commuter/${session.userId}`),
      apiFetch<Booking[]>(`/api/bookings/user/${session.userId}`),
      apiFetch<Wallet>(`/api/wallet/${session.userId}`),
    ]);
    setUser(u);
    setBookings(b);
    setWallet(w);
  };
  useLivePolling(load, ["bookings", "notifications"], 5000);
  // Taxis near the commuter. Needs their position; the backend only returns
  // approximate positions of online drivers within a few km.
  const hasCoords = Number.isFinite(coords[0]) && Number.isFinite(coords[1]) && (coords[0] !== 0 || coords[1] !== 0);
  usePolling(async () => {
    if (!hasCoords) return;
    setNearbyTaxis(await apiFetch<NearbyTaxi[]>("/api/locations/nearby", { query: { lat: coords[0], lng: coords[1] } }));
  }, 15_000);

  const activeTrip = bookings.find((b) => b.status === "ACCEPTED") ?? null;
  const [driverPos, setDriverPos] = useState<NearbyTaxi | null>(null);
  useLivePolling(
    async () => {
      if (!activeTrip) return;
      const pos = await apiFetch<{ lat?: number; lng?: number }>(`/api/bookings/${activeTrip.id}/driver-position`);
      setDriverPos(pos.lat != null && pos.lng != null ? { lat: pos.lat, lng: pos.lng } : null);
    },
    ["bookings"],
    10_000,
    10_000,
    !!activeTrip,
  );
  const offeredTrip = activeTrip ? null : bookings.find((b) => b.status === "OFFERED") ?? null;
  // Scheduled trips not yet shown to drivers are listed as upcoming, not as "looking for a driver".
  const waitingTrip = activeTrip || offeredTrip ? null : bookings.find((b) => b.status === "PENDING" && b.releasedAt != null) ?? null;
  const upcoming = bookings
    .filter((b) => b.status === "PENDING" && b.releasedAt == null && b.scheduledAt)
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
  // The latest request, if nobody took it within the last hour and it hasn't been dismissed here.
  const [now] = useState(() => Date.now());
  const [dismissedExpired, setDismissedExpired] = useState<number[]>(() => readDismissed());
  const latest = bookings[0];
  const expiredTrip =
    !waitingTrip && !offeredTrip && !activeTrip && latest?.status === "EXPIRED" && latest.requestExpiresAt &&
    now - new Date(latest.requestExpiresAt).getTime() < 60 * 60_000 && !dismissedExpired.includes(latest.id)
      ? latest
      : null;
  const dismissExpired = (id: number) => {
    const next = [...dismissedExpired, id].slice(-20);
    setDismissedExpired(next);
    try {
      window.localStorage.setItem(DISMISSED_EXPIRED, JSON.stringify(next));
    } catch {
      // storage blocked: it just shows again next time
    }
  };
  const [answering, setAnswering] = useState(false);

  // Draw the active trip's route. Keyed by trip so a stale route is never shown for a new trip.
  const pickup = activeTrip?.pickupLocation;
  const destination = activeTrip?.destination;
  const tripKey = activeTrip ? `${activeTrip.id}|${pickup}|${destination}` : null;
  useEffect(() => {
    if (!tripKey || !pickup || !destination) return;
    let cancelled = false;
    (async () => {
      try {
        const [a, b] = await Promise.all([geocodeLocation(pickup), geocodeLocation(destination)]);
        const path = a && b ? await buildRoutePolyline(a, b) : [];
        if (!cancelled) setRoute({ key: tripKey, path, failed: path.length === 0 });
      } catch {
        if (!cancelled) setRoute({ key: tripKey, path: [], failed: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripKey, pickup, destination]);
  const currentRoute = route && route.key === tripKey ? route : null;
  const routeStatus = !tripKey ? "idle" : !currentRoute ? "loading" : currentRoute.failed ? "error" : "idle";

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!from.trim() || !to.trim()) {
      toast.error(t("home.needBoth"));
      return;
    }
    setSubmitting(true);
    try {
      // Coordinates help the driver find the pick-up: geocoded, or this phone's position.
      const [p, d] = await Promise.allSettled([geocodeLocation(from.trim()), geocodeLocation(to.trim())]);
      const pickupAt = (p.status === "fulfilled" && p.value) || (hasCoords ? ([coords[0], coords[1]] as LatLng) : null);
      const destAt = d.status === "fulfilled" ? d.value : null;
      const res = await apiFetch<CreateBookingResponse>("/api/bookings/create", {
        method: "POST",
        body: {
          pickupLocation: from.trim(),
          destination: to.trim(),
          ...(pickupAt ? { pickupLat: pickupAt[0], pickupLng: pickupAt[1] } : {}),
          ...(destAt ? { destinationLat: destAt[0], destinationLng: destAt[1] } : {}),
        },
        idempotencyKey: newIdempotencyKey(),
      });
      toast.success(res.message);
      setFrom("");
      setTo("");
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (trip: Booking) => {
    const refundNote = trip.status === "ACCEPTED" ? ` ${t("home.cancelRefundNote")}` : "";
    const ok = await confirm({
      title: t("home.cancelTitle"),
      message: `${t("home.cancelMessage")}${refundNote}`,
      confirmLabel: t("home.cancelConfirm"),
      cancelLabel: t("home.cancelKeep"),
      danger: true,
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/bookings/${trip.id}/cancel`, { method: "PUT" });
      toast.success(trip.status === "ACCEPTED" ? t("home.cancelledRefunded") : t("home.requestCancelled"));
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const answerOffer = async (trip: Booking, accept: boolean) => {
    setAnswering(true);
    try {
      if (accept) {
        await apiFetch(`/api/bookings/${trip.id}/accept-offer`, { method: "PUT", idempotencyKey: newIdempotencyKey() });
        toast.success(t("home.offerAccepted", { amount: ((trip.fare ?? 0) + (trip.tip ?? 0)).toFixed(2) }));
      } else {
        await apiFetch(`/api/bookings/${trip.id}/decline-offer`, { method: "PUT" });
        toast.info(t("home.offerDeclined"));
      }
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.code === "INSUFFICIENT_FUNDS") {
        toast.error(t("home.insufficient", { balance: Number(err.body?.balance ?? 0).toFixed(2) }));
      } else if (err instanceof ApiError && err.code === "OFFER_NOT_AVAILABLE") {
        toast.error(t("home.offerGone"));
        await load();
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setAnswering(false);
    }
  };

  const handlePanic = async (trip: Booking) => {
    const ok = await confirm({
      title: t("safety.panicTitle"),
      message: t("safety.panicMessage"),
      confirmLabel: t("safety.panicConfirm"),
      danger: true,
    });
    if (!ok) return;
    try {
      await apiFetch("/api/agents/safety/panic", { method: "POST", query: { bookingId: trip.id } });
      toast.success(t("safety.panicSent"));
    } catch (err) {
      toast.error(t("safety.panicFailed", { error: errorMessage(err) }));
    }
  };

  const handleShare = async (trip: Booking) => {
    try {
      const { url } = await apiFetch<{ url: string }>(`/api/bookings/${trip.id}/share`, { method: "POST" });
      setSharing(true);
      const text = t("share.text");
      if (typeof navigator.share === "function") {
        await navigator.share({ title: t("share.title"), text, url }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast.success(t("share.copied"));
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const stopSharing = async (trip: Booking) => {
    try {
      await apiFetch(`/api/bookings/${trip.id}/share`, { method: "DELETE" });
      setSharing(false);
      toast.success(t("share.stopped"));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-40 font-sans">
      <header className="p-6 flex items-center justify-between bg-white rounded-b-[40px] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FFD217] rounded-full flex items-center justify-center font-black text-xl border-2 border-white shadow-inner uppercase">
            {user?.fullName?.charAt(0) || "?"}
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{t("home.greeting")}</p>
            <p className="font-black text-lg">{user?.fullName || t("common.syncing")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/wallet" className="px-4 py-3 bg-gray-50 rounded-2xl font-black text-sm" aria-label={t("home.walletBalance")}>
            R{wallet ? wallet.balance.toFixed(2) : "--"}
          </Link>
          <NotificationBell />
        </div>
      </header>

      <AppPrompts role="COMMUTER" />

      <div className="p-4 h-80">
        <div className="relative h-full bg-white rounded-[40px] overflow-hidden shadow-lg border-4 border-white">
          <LiveMap center={coords} nearbyTaxis={activeTrip && driverPos ? [driverPos] : nearbyTaxis} routePath={currentRoute?.path ?? []} />
          {routeStatus === "loading" && (
            <div className="absolute top-4 left-4 bg-black/80 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full z-[1000]">{t("home.buildingRoute")}</div>
          )}
          {routeStatus === "error" && (
            <div className="absolute top-4 left-4 bg-red-500/90 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full z-[1000]">{t("home.routeUnavailable")}</div>
          )}
          <div className="absolute bottom-4 left-4 right-20 bg-white/90 backdrop-blur-md p-4 rounded-[24px] shadow-xl z-[1000]">
            <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">{t("home.taxisNearby")}</p>
            <p className="text-sm font-black">{t("home.activeCount", { count: nearbyTaxis.length })}</p>
          </div>
        </div>
      </div>

      {expiredTrip && (
        <div className="px-4 pt-2">
          <div className="bg-white rounded-[32px] p-6 shadow-lg border-2 border-gray-200" role="status">
            <p className="font-black">{t("home.expiredTitle")}</p>
            <p className="text-xs font-bold text-gray-500 mt-1">
              {t("home.expiredNote", { route: `${expiredTrip.pickupLocation} → ${expiredTrip.destination}` })}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setFrom(expiredTrip.pickupLocation);
                  setTo(expiredTrip.destination);
                  dismissExpired(expiredTrip.id);
                }}
                className="flex-1 py-3 bg-[#FFD217] font-black text-xs rounded-2xl uppercase tracking-widest"
              >
                {t("home.requestAgain")}
              </button>
              <button onClick={() => dismissExpired(expiredTrip.id)} className="px-4 py-3 font-black text-xs rounded-2xl uppercase text-gray-400">
                {t("common.dismiss")}
              </button>
            </div>
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="px-4 pt-2" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2">
            {t("home.upcoming")}
          </h2>
          <div className="space-y-2">
            {upcoming.map((u) => (
              <div key={u.id} className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">
                  {t("home.scheduledFor", { when: formatWhen(u.scheduledAt!, tag) })}
                </p>
                <p className="font-black mt-1">
                  {u.pickupLocation} → {u.destination}
                </p>
                <p className="text-xs font-bold text-gray-400 mt-1">{t("home.releaseNote")}</p>
                <button onClick={() => handleCancel(u)} className="mt-3 text-red-500 font-black text-[10px] uppercase tracking-widest">
                  {t("home.cancelScheduled")}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="p-4">
        <form onSubmit={handleRequest} className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-50">
          <h2 className="text-2xl font-black mb-6">{t("home.startTrip")}</h2>
          <input
            aria-label={t("home.pickup")}
            className="w-full p-5 bg-gray-50 rounded-2xl mb-4 outline-none font-bold"
            placeholder={t("home.pickup")}
            maxLength={200}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            aria-label={t("home.destination")}
            className="w-full p-5 bg-gray-50 rounded-2xl mb-6 outline-none font-bold"
            placeholder={t("home.destination")}
            maxLength={200}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <button type="submit" disabled={submitting} className="w-full bg-[#FFD217] text-black font-black py-5 rounded-2xl shadow-xl disabled:opacity-60">
            {submitting ? t("home.sending") : t("home.requestTaxi")}
          </button>
          <p className="text-[11px] font-bold text-gray-400 mt-4 text-center">
            {t("home.howFares")}
          </p>
        </form>
      </div>

      {offeredTrip && (
        <div className="fixed bottom-28 left-6 right-6 bg-white p-6 rounded-[32px] shadow-2xl border-2 border-[#FFD217] z-[2000] animate-bounce-in text-black">
          <div className="flex justify-between items-start">
            <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">{t("home.fareOffer")}</p>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              <Countdown until={offeredTrip.offerExpiresAt} />
            </p>
          </div>
          <h3 className="font-black text-lg">
            {offeredTrip.driverName ?? t("home.aDriver")}
            {offeredTrip.taxiPlate ? ` · ${offeredTrip.taxiPlate}` : ""}
          </h3>
          <p className="text-xs font-black text-[#B88600]">{ratingText(offeredTrip.driverRating, offeredTrip.driverRatingCount, t)}</p>
          <p className="text-xs font-bold text-gray-500">
            {offeredTrip.pickupLocation} → {offeredTrip.destination}
          </p>
          <p className="text-3xl font-black mt-2">R{((offeredTrip.fare ?? 0) + (offeredTrip.tip ?? 0)).toFixed(2)}</p>
          {wallet && wallet.balance < (offeredTrip.fare ?? 0) + (offeredTrip.tip ?? 0) && (
            <p className="text-xs font-bold text-red-600 mt-1">
              {t("home.lowBalance", { balance: wallet.balance.toFixed(2) })}{" "}
              <Link href="/wallet" className="underline">
                {t("home.topUp")}
              </Link>{" "}
              {t("home.toAccept")}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={() => answerOffer(offeredTrip, false)}
              disabled={answering}
              className="py-4 bg-gray-100 font-black text-xs rounded-2xl uppercase tracking-widest disabled:opacity-60"
            >
              {t("home.decline")}
            </button>
            <button
              onClick={() => answerOffer(offeredTrip, true)}
              disabled={answering}
              className="py-4 bg-black text-[#FFD217] font-black text-xs rounded-2xl uppercase tracking-widest disabled:opacity-60"
            >
              {t("home.acceptPay")}
            </button>
          </div>
        </div>
      )}

      {waitingTrip && (
        <div className="fixed bottom-28 left-6 right-6 bg-white p-6 rounded-[32px] shadow-2xl border-2 border-gray-200 z-[2000] animate-bounce-in text-black">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t("home.lookingForDriver")}</p>
          <h3 className="font-black text-lg">
            {waitingTrip.pickupLocation} → {waitingTrip.destination}
          </h3>
          <p className="text-xs font-bold text-gray-400 mt-1">{t("home.waitingNote")}</p>
          {waitingTrip.requestExpiresAt && (
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
              {t("home.stillLooking")} · <Countdown until={waitingTrip.requestExpiresAt} />
            </p>
          )}
          <button onClick={() => handleCancel(waitingTrip)} className="w-full mt-4 py-3 bg-red-50 text-red-500 font-black text-[10px] rounded-2xl uppercase tracking-widest active:bg-red-100 transition">
            {t("home.cancelRequest")}
          </button>
        </div>
      )}

      {activeTrip && (
        <div className="fixed bottom-28 left-6 right-6 bg-white p-6 rounded-[32px] shadow-2xl border-2 border-[#FFD217] z-[2000] animate-bounce-in text-black">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest" role="status">
                {activeTrip.startedAt ? t("trip.onYourWay") : activeTrip.arrivedAt ? t("trip.driverArrived") : t("trip.driverComing")}
              </p>
              <h3 className="font-black text-lg">{activeTrip.driverName ?? t("trip.yourDriver")}</h3>
              <p className="text-xs font-bold text-gray-400 tracking-tighter">
                {activeTrip.taxiPlate ? `${activeTrip.taxiPlate} · ` : ""}
                {t("trip.fare", { fare: (activeTrip.fare ?? 0).toFixed(2) })}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowChat(true)} aria-label={t("trip.chatWithDriver")} className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition">
                <ChatIcon />
              </button>
              {activeTrip.driverPhone && (
                <a href={`tel:${activeTrip.driverPhone}`} aria-label={t("trip.callDriver")} className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white active:scale-90 transition">
                  <PhoneIcon />
                </a>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => handlePanic(activeTrip)} className="py-3 bg-red-600 text-white font-black text-[10px] rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition">
              <AlertIcon className="w-4 h-4" /> {t("safety.emergency")}
            </button>
            <button onClick={() => handleCancel(activeTrip)} className="py-3 bg-red-50 text-red-500 font-black text-[10px] rounded-2xl uppercase tracking-widest active:bg-red-100 transition">
              {t("trip.cancelRide")}
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => handleShare(activeTrip)} className="flex-1 py-3 bg-black text-[#FFD217] font-black text-[10px] rounded-2xl uppercase tracking-widest active:scale-95 transition">
              {sharing ? t("share.again") : t("share.myTrip")}
            </button>
            {sharing && (
              <button onClick={() => stopSharing(activeTrip)} className="px-4 py-3 bg-gray-100 font-black text-[10px] rounded-2xl uppercase tracking-widest">
                {t("share.stop")}
              </button>
            )}
          </div>
        </div>
      )}

      <RatePrompt trips={bookings} role="COMMUTER" onRated={() => void load()} />
      {showChat && activeTrip && <ChatModal bookingId={activeTrip.id} title={t("trip.chatWithDriver")} onClose={() => setShowChat(false)} />}

      <CommuterNav current="home" />
    </div>
  );
}
