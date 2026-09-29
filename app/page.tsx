"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ChatModal from './components/ChatModal';
import { useGeolocation } from './lib/useGeolocation';
import { buildRoutePolyline, geocodeLocation } from './lib/geo';

const LiveMap = dynamic(() => import('./components/LiveMap'), { ssr: false });

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const { coords } = useGeolocation();
  const [nearbyTaxis, setNearbyTaxis] = useState([]);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const sessionStr = localStorage.getItem('etekisi_session');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      const fetchData = async () => {
        const uRes = await fetch(`http://localhost:8080/api/auth/commuter/${session.userId}`);
        if (uRes.ok) setUser(await uRes.json());
        const bRes = await fetch(`http://localhost:8080/api/bookings/user/${session.userId}`);
        if (bRes.ok) {
          const bookings = await bRes.json();
          setActiveTrip(bookings.find((b: any) => b.status === "ACCEPTED") || null);
        }
      };
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    fetch('http://localhost:8080/api/locations/nearby').then(res => res.json()).then(data => setNearbyTaxis(data));
  }, []);

  useEffect(() => {
    if (!activeTrip?.pickupLocation || !activeTrip?.destination) {
      setRoutePath([]);
      setRouteStatus("idle");
      return;
    }

    let cancelled = false;
    const buildRoute = async () => {
      try {
        setRouteStatus("loading");
        const pickupCoords = await geocodeLocation(activeTrip.pickupLocation);
        const destinationCoords = await geocodeLocation(activeTrip.destination);
        if (!pickupCoords || !destinationCoords) {
          if (!cancelled) {
            setRoutePath([]);
            setRouteStatus("error");
          }
          return;
        }
        const route = await buildRoutePolyline(pickupCoords, destinationCoords);
        if (!cancelled) {
          setRoutePath(route);
          setRouteStatus(route.length ? "idle" : "error");
        }
      } catch {
        if (!cancelled) {
          setRoutePath([]);
          setRouteStatus("error");
        }
      }
    };

    buildRoute();
    return () => {
      cancelled = true;
    };
  }, [activeTrip?.id, activeTrip?.pickupLocation, activeTrip?.destination]);

  const handleRequest = async () => {
    if (!from || !to) return alert("Enter locations");
    setLoading(true);
    const session = JSON.parse(localStorage.getItem('etekisi_session') || '{}');
    await fetch('http://localhost:8080/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commuterId: session.userId, pickupLocation: from, destination: to })
    });
    setLoading(false);
    alert("Request sent!");
  };

  const handleCancel = async () => {
    if (confirm("Cancel your ride?")) {
      await fetch(`http://localhost:8080/api/bookings/${activeTrip.id}/cancel?role=COMMUTER`, { method: 'PUT' });
      setActiveTrip(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-40 font-sans">
      <div className="p-6 flex items-center justify-between bg-white rounded-b-[40px] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FFD217] rounded-full flex items-center justify-center font-black text-xl border-2 border-white shadow-inner uppercase">{user?.fullName?.charAt(0) || '?'}</div>
          <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Heita!</p><p className="font-black text-lg">{user?.fullName || 'Syncing...'}</p></div>
        </div>
        <Link href="/notifications" className="p-3 bg-gray-50 rounded-2xl text-gray-600 relative active:scale-90 transition">
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
        </Link>
      </div>

      <div className="p-4 h-80"><div className="relative h-full bg-white rounded-[40px] overflow-hidden shadow-lg border-4 border-white">
        <LiveMap center={coords} nearbyTaxis={nearbyTaxis} routePath={routePath} />
        {routeStatus === "loading" && (
          <div className="absolute top-4 left-4 bg-black/80 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full z-[1000]">
            Building route...
          </div>
        )}
        {routeStatus === "error" && (
          <div className="absolute top-4 left-4 bg-red-500/90 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full z-[1000]">
            Route unavailable
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-[24px] flex items-center justify-between shadow-xl z-[1000]">
          <div><p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">Taxis Nearby</p><p className="text-sm font-black">{nearbyTaxis.length} Taxis active</p></div>
        </div>
      </div></div>

      <div className="p-4">
        <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-50">
          <h2 className="text-2xl font-black mb-6">Start Your Trip</h2>
          <input className="w-full p-5 bg-gray-50 rounded-2xl mb-4 outline-none font-bold" placeholder="Pick-up Point" onChange={e => setFrom(e.target.value)} />
          <input className="w-full p-5 bg-gray-50 rounded-2xl mb-6 outline-none font-bold" placeholder="Destination" onChange={e => setTo(e.target.value)} />
          <button onClick={handleRequest} className="w-full bg-[#FFD217] text-black font-black py-5 rounded-2xl shadow-xl">{loading ? "SENDING..." : "Request Taxi"}</button>
        </div>
      </div>

      {activeTrip && (
        <div className="fixed bottom-28 left-6 right-6 bg-white p-6 rounded-[32px] shadow-2xl border-2 border-[#FFD217] z-[2000] animate-bounce-in text-black">
          <div className="flex justify-between items-center mb-4">
            <div><p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">Driver on the way</p><h3 className="font-black text-lg">{activeTrip.driverName}</h3><p className="text-xs font-bold text-gray-400 tracking-tighter">Fare set by driver: R{activeTrip.fare}</p></div>
            <div className="flex gap-2">
              <button onClick={() => setShowChat(true)} className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg></button>
              <a href={`tel:${activeTrip.driverPhone}`} className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white active:scale-90 transition"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg></a>
            </div>
          </div>
          <button onClick={handleCancel} className="w-full mt-4 py-3 bg-red-50 text-red-500 font-black text-[10px] rounded-2xl uppercase tracking-widest active:bg-red-100 transition">Cancel Ride</button>
        </div>
      )}

      {showChat && <ChatModal bookingId={activeTrip.id} senderId={user.id} onClose={() => setShowChat(false)} />}
      
      <div className="fixed bottom-6 left-6 right-6 bg-white/95 backdrop-blur-xl h-20 rounded-[30px] shadow-2xl flex justify-around items-center px-4 z-50 border border-gray-100">
        <NavBtn active label="HOME" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>} />
        <Link href="/book"><NavBtn label="BOOK" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>} /></Link>
        <Link href="/profile"><NavBtn label="PROFILE" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>} /></Link>
      </div>
    </div>
  );
}

function NavBtn({ icon, label, active = false }: any) {
  return (
    <div className={`flex flex-col items-center gap-1 ${active ? 'text-black' : 'text-gray-300'}`}>
      <div className="w-6 h-6">{icon}</div>
      <span className="text-[9px] font-black tracking-tighter uppercase">{label}</span>
    </div>
  );
}
