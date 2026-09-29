"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import ChatModal from "../components/ChatModal";
import { useAuthedSession } from "../components/RequireAuth";
import { useConfirm, useToast } from "../components/Feedback";
import { AlertIcon, ChatIcon, PhoneIcon } from "../components/Icons";
import { CommuterNav, NotificationBell } from "../components/Nav";
import { apiFetch, errorMessage, newIdempotencyKey } from "../lib/api";
import { buildRoutePolyline, geocodeLocation } from "../lib/geo";
import { usePolling } from "../lib/usePolling";
import { useGeolocation } from "../lib/useGeolocation";
import type { Booking, Commuter, CreateBookingResponse, DriverLocation, LatLng, Wallet } from "../lib/types";

const LiveMap = dynamic(() => import("../components/LiveMap"), { ssr: false });

type RouteState = { key: string; path: LatLng[]; failed: boolean };

export default function Home() {
  const session = useAuthedSession();
  const toast = useToast();
  const confirm = useConfirm();
  const { coords } = useGeolocation();

  const [user, setUser] = useState<Commuter | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nearbyTaxis, setNearbyTaxis] = useState<DriverLocation[]>([]);
  const [showChat, setShowChat] = useState(false);
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
  usePolling(load, 5000);
  usePolling(async () => setNearbyTaxis(await apiFetch<DriverLocation[]>("/api/locations/nearby")), 15_000);

  const activeTrip = bookings.find((b) => b.status === "ACCEPTED") ?? null;
  const waitingTrip = activeTrip ? null : bookings.find((b) => b.status === "PENDING") ?? null;

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
      toast.error("Enter a pick-up point and a destination.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<CreateBookingResponse>("/api/bookings/create", {
        method: "POST",
        body: { pickupLocation: from.trim(), destination: to.trim() },
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
    const refundNote = trip.status === "ACCEPTED" ? " Your fare will be refunded to your wallet." : "";
    const ok = await confirm({ title: "Cancel your ride?", message: `This can't be undone.${refundNote}`, confirmLabel: "Cancel ride", cancelLabel: "Keep ride", danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/api/bookings/${trip.id}/cancel`, { method: "PUT" });
      toast.success(trip.status === "ACCEPTED" ? "Ride cancelled and refunded." : "Ride request cancelled.");
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handlePanic = async (trip: Booking) => {
    const ok = await confirm({
      title: "Send an emergency alert?",
      message: "e-Tekisi operators will be alerted right away with your trip details. If you are in immediate danger, also call 10111 or 112.",
      confirmLabel: "Send alert",
      danger: true,
    });
    if (!ok) return;
    try {
      await apiFetch("/api/agents/safety/panic", { method: "POST", query: { bookingId: trip.id } });
      toast.success("Alert sent. An operator will follow up.");
    } catch (err) {
      toast.error(`Alert failed: ${errorMessage(err)}. Call 10111 or 112.`);
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
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Heita!</p>
            <p className="font-black text-lg">{user?.fullName || "Syncing..."}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/wallet" className="px-4 py-3 bg-gray-50 rounded-2xl font-black text-sm" aria-label="Wallet balance">
            R{wallet ? wallet.balance.toFixed(2) : "--"}
          </Link>
          <NotificationBell />
        </div>
      </header>

      <div className="p-4 h-80">
        <div className="relative h-full bg-white rounded-[40px] overflow-hidden shadow-lg border-4 border-white">
          <LiveMap center={coords} nearbyTaxis={nearbyTaxis} routePath={currentRoute?.path ?? []} />
          {routeStatus === "loading" && (
            <div className="absolute top-4 left-4 bg-black/80 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full z-[1000]">Building route...</div>
          )}
          {routeStatus === "error" && (
            <div className="absolute top-4 left-4 bg-red-500/90 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full z-[1000]">Route unavailable</div>
          )}
          <div className="absolute bottom-4 left-4 right-20 bg-white/90 backdrop-blur-md p-4 rounded-[24px] shadow-xl z-[1000]">
            <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">Taxis Nearby</p>
            <p className="text-sm font-black">{nearbyTaxis.length} active</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <form onSubmit={handleRequest} className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-50">
          <h2 className="text-2xl font-black mb-6">Start Your Trip</h2>
          <input
            aria-label="Pick-up point"
            className="w-full p-5 bg-gray-50 rounded-2xl mb-4 outline-none font-bold"
            placeholder="Pick-up Point"
            maxLength={200}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            aria-label="Destination"
            className="w-full p-5 bg-gray-50 rounded-2xl mb-6 outline-none font-bold"
            placeholder="Destination"
            maxLength={200}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <button type="submit" disabled={submitting} className="w-full bg-[#FFD217] text-black font-black py-5 rounded-2xl shadow-xl disabled:opacity-60">
            {submitting ? "SENDING..." : "Request Taxi"}
          </button>
          <p className="text-[11px] font-bold text-gray-400 mt-4 text-center">
            The driver sets the fare. It&apos;s paid from your wallet when they accept.
          </p>
        </form>
      </div>

      {waitingTrip && (
        <div className="fixed bottom-28 left-6 right-6 bg-white p-6 rounded-[32px] shadow-2xl border-2 border-gray-200 z-[2000] animate-bounce-in text-black">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Looking for a driver</p>
          <h3 className="font-black text-lg">
            {waitingTrip.pickupLocation} → {waitingTrip.destination}
          </h3>
          <p className="text-xs font-bold text-gray-400 mt-1">We&apos;ll notify you when a driver sets the fare.</p>
          <button onClick={() => handleCancel(waitingTrip)} className="w-full mt-4 py-3 bg-red-50 text-red-500 font-black text-[10px] rounded-2xl uppercase tracking-widest active:bg-red-100 transition">
            Cancel Request
          </button>
        </div>
      )}

      {activeTrip && (
        <div className="fixed bottom-28 left-6 right-6 bg-white p-6 rounded-[32px] shadow-2xl border-2 border-[#FFD217] z-[2000] animate-bounce-in text-black">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">Driver on the way</p>
              <h3 className="font-black text-lg">{activeTrip.driverName ?? "Your driver"}</h3>
              <p className="text-xs font-bold text-gray-400 tracking-tighter">
                {activeTrip.taxiPlate ? `${activeTrip.taxiPlate} · ` : ""}Fare R{(activeTrip.fare ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowChat(true)} aria-label="Chat with driver" className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition">
                <ChatIcon />
              </button>
              {activeTrip.driverPhone && (
                <a href={`tel:${activeTrip.driverPhone}`} aria-label="Call driver" className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white active:scale-90 transition">
                  <PhoneIcon />
                </a>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => handlePanic(activeTrip)} className="py-3 bg-red-600 text-white font-black text-[10px] rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition">
              <AlertIcon className="w-4 h-4" /> Emergency
            </button>
            <button onClick={() => handleCancel(activeTrip)} className="py-3 bg-red-50 text-red-500 font-black text-[10px] rounded-2xl uppercase tracking-widest active:bg-red-100 transition">
              Cancel Ride
            </button>
          </div>
        </div>
      )}

      {showChat && activeTrip && <ChatModal bookingId={activeTrip.id} title="Chat with driver" onClose={() => setShowChat(false)} />}

      <CommuterNav current="home" />
    </div>
  );
}
