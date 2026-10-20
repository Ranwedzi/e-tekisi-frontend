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
import { useLivePolling } from "../lib/live";
import { useGeolocation } from "../lib/useGeolocation";
import type { Booking, Driver, TripCompletedResponse } from "../lib/types";

const LiveMap = dynamic(() => import("../components/LiveMap"), { ssr: false });

export default function DriverDashboard() {
  const session = useAuthedSession();
  const toast = useToast();
  const confirm = useConfirm();
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
      toast.success(`Offer of R${((offered.fare ?? 0) + (offered.tip ?? 0)).toFixed(2)} sent. Waiting for ${offered.commuterName ?? "the commuter"} to accept.`);
      setFareFor(null);
    } catch (err) {
      if (err instanceof ApiError && err.code === "BOOKING_NOT_PENDING") {
        toast.error("Another driver already made an offer on this trip.");
        setFareFor(null);
      } else if (err instanceof ApiError && err.code === "DRIVER_OFFLINE") {
        toast.error("Go online to send offers.");
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
    if (!(await confirm({ title: "Withdraw your offer?", message: "The trip goes back to other drivers.", confirmLabel: "Withdraw" }))) return;
    try {
      await apiFetch(`/api/bookings/${offer.id}/cancel`, { method: "PUT" });
      toast.success("Offer withdrawn.");
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const complete = async (trip: Booking) => {
    if (!(await confirm({ title: "Complete this trip?", message: `${trip.pickupLocation} → ${trip.destination}. The fare is added to your balance.`, confirmLabel: "Complete" }))) return;
    try {
      const res = await apiFetch<TripCompletedResponse>(`/api/bookings/${trip.id}/complete/${session.userId}`, {
        method: "PUT",
        idempotencyKey: newIdempotencyKey(),
      });
      toast.success(`Trip completed. R${res.earned.toFixed(2)} added to your balance.`);
      setShowChat(false);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const cancel = async (trip: Booking) => {
    if (!(await confirm({ title: "Cancel this job?", message: "The commuter gets a full refund.", confirmLabel: "Cancel job", cancelLabel: "Keep job", danger: true }))) return;
    try {
      await apiFetch(`/api/bookings/${trip.id}/cancel`, { method: "PUT" });
      toast.success("Job cancelled. The commuter has been refunded.");
      setShowChat(false);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const panic = async (trip: Booking) => {
    if (!(await confirm({ title: "Send an emergency alert?", message: "e-Tekisi operators will be alerted right away. If you are in immediate danger, also call 10111 or 112.", confirmLabel: "Send alert", danger: true }))) return;
    try {
      await apiFetch("/api/agents/safety/panic", { method: "POST", query: { bookingId: trip.id } });
      toast.success("Alert sent. An operator will follow up.");
    } catch (err) {
      toast.error(`Alert failed: ${errorMessage(err)}. Call 10111 or 112.`);
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
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Driver Partner</p>
            <h1 className="text-xl font-black">{driver.fullName}</h1>
          </div>
        </div>
        <NotificationBell dark />
      </header>

      <div className="p-4 h-80">
        <div className="relative h-full bg-[#262626] rounded-[40px] overflow-hidden border-4 border-[#333] shadow-2xl">
          <LiveMap center={coords} />
        </div>
      </div>

      <div className="px-6 pb-6">
        {driver.approvalStatus !== "APPROVED" && (
          <div role="status" className={`mb-4 p-5 rounded-[24px] border ${driver.approvalStatus === "REJECTED" ? "bg-red-950/60 border-red-800 text-red-200" : "bg-[#262626] border-[#FFD217]/40 text-gray-200"}`}>
            <p className="font-black text-sm">
              {driver.approvalStatus === "REJECTED" ? "Your account was not approved" : "Your account is being checked"}
            </p>
            <p className="text-xs font-bold mt-1 opacity-80">
              {driver.approvalStatus === "REJECTED"
                ? driver.approvalNote ?? "Contact e-Tekisi support for details."
                : driver.approvalNote ??
                  "Upload your licence, PrDP and operating licence. We check them before you can take trips, and you'll get a notification when it's done."}
            </p>
            {driver.approvalStatus === "PENDING_APPROVAL" && (
              <Link href="/driver/documents" className="inline-block mt-3 px-4 py-2 rounded-xl bg-[#FFD217] text-black font-black text-xs uppercase">
                My documents
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
          {isOnline ? "YOU ARE ONLINE" : "GO ONLINE"}
        </button>
        {isOnline && !hasValidCoords && (
          <p className="text-xs font-bold text-yellow-400 mt-3 text-center">Allow location access so commuters can see your taxi.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 px-6 mb-6">
        <Link href="/driver/queue" className="bg-[#262626] p-6 rounded-[32px] border border-[#FFD217]/10 flex flex-col items-center gap-2 shadow-lg text-[#FFD217]">
          <QueueIcon />
          <p className="font-black text-[10px] uppercase tracking-widest">Queue Manager</p>
        </Link>
        <Link href="/driver/earnings" className="bg-[#262626] p-6 rounded-[32px] border border-[#FFD217]/10 flex flex-col items-center gap-2 shadow-lg text-[#FFD217]">
          <CalendarIcon />
          <p className="font-black text-[10px] uppercase tracking-widest">Earnings</p>
        </Link>
      </div>

      {myOffers.length > 0 && (
        <section className="px-6 mb-8">
          <h3 className="font-black text-lg mb-4 uppercase tracking-tighter">Your Offers</h3>
          <div className="space-y-4">
            {myOffers.map((o) => (
              <div key={o.id} className="bg-[#262626] p-6 rounded-[32px] border-l-8 border-green-500 shadow-xl">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Waiting for {o.commuterName ?? "commuter"}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <Countdown until={o.offerExpiresAt} expiredLabel="Expiring" />
                  </p>
                </div>
                <p className="font-black text-lg leading-tight mb-1">
                  {o.pickupLocation} → {o.destination}
                </p>
                <p className="text-sm font-bold text-[#FFD217] mb-4">R{((o.fare ?? 0) + (o.tip ?? 0)).toFixed(2)}</p>
                <button onClick={() => withdraw(o)} className="w-full bg-[#333] text-gray-300 font-black py-3 rounded-2xl text-xs uppercase">
                  Withdraw offer
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="px-6">
        <h3 className="font-black text-lg mb-4 uppercase tracking-tighter">Incoming Requests</h3>
        {!isOnline && <p className="text-sm font-bold text-gray-500 mb-4">Go online to start taking trips.</p>}
        <div className="space-y-4">
          {isOnline && pending.length === 0 && <p className="text-sm font-bold text-gray-500">No open requests right now.</p>}
          {isOnline &&
            pending.map((b) => (
              <div key={b.id} className="bg-[#262626] p-6 rounded-[32px] border-l-8 border-[#FFD217] shadow-xl animate-in fade-in slide-in-from-bottom-4">
                {b.scheduledTime && <p className="text-xs font-bold text-gray-500 mb-2">Scheduled: {b.scheduledTime.replace("T", " ")}</p>}
                <p className="font-black text-lg leading-tight mb-2">
                  {b.pickupLocation} → {b.destination}
                </p>
                {b.tip ? <p className="text-xs font-bold text-green-400 mb-4">+ R{b.tip.toFixed(2)} tip</p> : <div className="mb-4" />}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setFareFor(b)} className="bg-white text-black font-black py-4 rounded-2xl text-xs uppercase shadow-lg">
                    Offer fare
                  </button>
                  <button onClick={() => decline(b)} className="bg-[#333] text-gray-400 font-black py-4 rounded-2xl text-xs uppercase">
                    Decline
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
                Active Job{activeTrips.length > 1 ? ` (1 of ${activeTrips.length})` : ""}
              </p>
              <h3 className="font-black text-lg">{activeTrip.commuterName ?? "Commuter"}</h3>
              <p className="text-xs font-bold text-gray-400">
                {activeTrip.pickupLocation} → {activeTrip.destination} · R{((activeTrip.fare ?? 0) + (activeTrip.tip ?? 0)).toFixed(2)}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowChat(true)} aria-label="Chat with commuter" className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition">
                <ChatIcon />
              </button>
              {activeTrip.commuterPhone && (
                <a href={`tel:${activeTrip.commuterPhone}`} aria-label="Call commuter" className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white active:scale-90 transition">
                  <PhoneIcon />
                </a>
              )}
            </div>
          </div>
          <button onClick={() => complete(activeTrip)} className="w-full py-4 bg-black text-[#FFD217] font-black text-xs rounded-2xl uppercase tracking-widest active:scale-95 transition">
            Complete Trip
          </button>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => panic(activeTrip)} className="py-3 bg-red-600 text-white font-black text-[10px] rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2">
              <AlertIcon className="w-4 h-4" /> Emergency
            </button>
            <button onClick={() => cancel(activeTrip)} className="py-3 bg-red-50 text-red-500 font-black text-[10px] rounded-2xl uppercase tracking-widest active:bg-red-100 transition">
              Cancel Job
            </button>
          </div>
        </div>
      )}

      {fareFor && <FareDialog booking={fareFor} busy={busy} onSubmit={(fare) => sendOffer(fareFor, fare)} onCancel={() => setFareFor(null)} />}
      {showChat && activeTrip && <ChatModal bookingId={activeTrip.id} title="Chat with commuter" onClose={() => setShowChat(false)} />}

      <DriverNav current="dashboard" />
    </div>
  );
}
