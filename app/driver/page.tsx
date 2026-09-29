"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ChatModal from '../components/ChatModal';
import { useGeolocation } from '../lib/useGeolocation';

const LiveMap = dynamic(() => import('../components/LiveMap'), { ssr: false });

export default function DriverDashboard() {
  const [driver, setDriver] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [earnings, setEarnings] = useState({ totalEarnings: 0, tripCount: 0 });
  const [bookings, setBookings] = useState<any[]>([]);
  const [declinedIds, setDeclinedIds] = useState<number[]>([]);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const { coords } = useGeolocation();
  const [loading, setLoading] = useState(true);

  const handleLogout = () => { localStorage.clear(); window.location.href = "/login"; };

  const hasValidCoords =
    Number.isFinite(coords[0]) && Number.isFinite(coords[1]) && (coords[0] !== 0 || coords[1] !== 0);

  const updateOnlineStatus = async (nextStatus: boolean) => {
    if (!driver?.id) return;
    setIsOnline(nextStatus);
    try {
      const res = await fetch(`http://localhost:8080/api/auth/driver/${driver.id}/status?active=${nextStatus}`, {
        method: "PUT",
      });
      if (res.ok) {
        const updated = await res.json();
        setIsOnline(updated.active);
      } else {
        setIsOnline((prev) => !prev);
      }
    } catch {
      setIsOnline((prev) => !prev);
    }
  };

  useEffect(() => {
    const sessionStr = localStorage.getItem('etekisi_session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);

    const fetchData = async () => {
      const uRes = await fetch(`http://localhost:8080/api/auth/driver/${session.userId}`);
      if (uRes.ok) {
        const data = await uRes.json();
        setDriver(data);
        setIsOnline(data.active);
      }
      
      const bRes = await fetch(`http://localhost:8080/api/bookings/pending`); 
      if (bRes.ok) setBookings(await bRes.json());

      const myRes = await fetch(`http://localhost:8080/api/bookings/user/${session.userId}`);
      if (myRes.ok) {
        const myData = await myRes.json();
        setActiveTrip(myData.find((b: any) => b.status === "ACCEPTED" && b.driverId === session.userId) || null);
      }
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!driver?.id || !isOnline || !hasValidCoords) return;

    const ping = async () => {
      await fetch("http://localhost:8080/api/locations/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: driver.id, lat: coords[0], lng: coords[1] }),
      });
    };

    ping();
    const interval = setInterval(ping, 10000);
    return () => clearInterval(interval);
  }, [driver?.id, isOnline, hasValidCoords, coords]);

  const handleAccept = async (id: number) => {
    const fare = prompt("Enter fare (R):");
    if (!fare) return;
    await fetch(`http://localhost:8080/api/bookings/${id}/accept/${driver.id}?fare=${fare}`, { method: 'PUT' });
  };

  if (loading) return <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#FFD217] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white font-sans pb-44">
      <div className="p-6 bg-[#262626] rounded-b-[40px] shadow-xl flex items-center justify-between border-b border-[#333]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#FFD217] rounded-full flex items-center justify-center text-black font-black text-2xl border-4 border-[#333] uppercase">{driver?.fullName?.charAt(0)}</div>
          <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Driver Partner</p><h1 className="text-xl font-black">{driver?.fullName}</h1></div>
        </div>
        <Link href="/notifications" className="p-3 bg-[#333] rounded-2xl text-[#FFD217] relative active:scale-90 transition">
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#333]"></div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
        </Link>
      </div>

      <div className="p-4 h-80"><div className="relative h-full bg-[#262626] rounded-[40px] overflow-hidden border-4 border-[#333] shadow-2xl"><LiveMap center={coords} /></div></div>

      <div className="px-6 pb-6">
        <button
          onClick={() => updateOnlineStatus(!isOnline)}
          className={`w-full py-8 rounded-[32px] font-black text-2xl transition-all shadow-2xl border-4 ${isOnline ? 'bg-green-600 border-green-400' : 'bg-[#FFD217] border-[#e6bd15] text-black'}`}
        >
          {isOnline ? "YOU ARE ONLINE" : "GO ONLINE"}
        </button>
      </div>

      {/* NEW: DASHBOARD ACTION BUTTONS */}
      <div className="grid grid-cols-2 gap-4 px-6 mb-6">
        <Link href="/driver/queue" className="bg-[#262626] p-6 rounded-[32px] border border-[#FFD217]/10 flex flex-col items-center gap-2 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#FFD217" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12v.75m0 3v.75m0 3v.75m0 3V18m-3-12h15c.621 0 1.125.504 1.125 1.125v10.5c0 .621-.504 1.125-1.125 1.125H4.5c-.621 0-1.125-.504-1.125-1.125V7.125C3.375 6.629 3.879 6.125 4.5 6.125Z" /></svg>
          <p className="font-black text-[10px] uppercase tracking-widest text-[#FFD217]">Queue Manager</p>
        </Link>
        <Link href="/book" className="bg-[#262626] p-6 rounded-[32px] border border-[#FFD217]/10 flex flex-col items-center gap-2 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#FFD217" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
          <p className="font-black text-[10px] uppercase tracking-widest text-[#FFD217]">Bookings</p>
        </Link>
      </div>

      <div className="px-6">
        <h3 className="font-black text-lg mb-4 uppercase tracking-tighter">Incoming Requests</h3>
        <div className="space-y-4">
          {/* Fix: Filter out non-pending or locally declined trips */}
          {bookings.filter(b => b.status === "PENDING" && !declinedIds.includes(b.id)).map((b: any) => (
            <div key={b.id} className="bg-[#262626] p-6 rounded-[32px] border-l-8 border-[#FFD217] shadow-xl animate-in fade-in slide-in-from-bottom-4">
              <p className="text-xs font-bold text-gray-500 mb-2">{b.scheduledTime}</p>
              <p className="font-black text-lg leading-tight mb-6">{b.pickupLocation} → {b.destination}</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleAccept(b.id)} className="bg-white text-black font-black py-4 rounded-2xl text-xs uppercase shadow-lg">Accept</button>
                <button onClick={() => setDeclinedIds([...declinedIds, b.id])} className="bg-[#333] text-gray-400 font-black py-4 rounded-2xl text-xs uppercase">Decline</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeTrip && (
        <div className="fixed bottom-28 left-6 right-6 bg-white p-6 rounded-[32px] shadow-2xl border-2 border-[#FFD217] z-[2000] text-black animate-bounce-in">
          <div className="flex justify-between items-center mb-4">
            <div><p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">Active Job</p><h3 className="font-black text-lg">{activeTrip.commuterName}</h3><p className="text-xs font-bold text-gray-400 font-black">Fare: R{activeTrip.fare}</p></div>
            <div className="flex gap-2">
              <button onClick={() => setShowChat(true)} className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg></button>
              <a href={`tel:${activeTrip.commuterPhone}`} className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white active:scale-90 transition"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg></a>
            </div>
          </div>
          <button onClick={async () => { await fetch(`http://localhost:8080/api/bookings/${activeTrip.id}/cancel?role=DRIVER`, { method: 'PUT' }); setActiveTrip(null); }} className="w-full mt-2 py-3 bg-red-50 text-red-500 font-black text-[10px] rounded-2xl uppercase tracking-widest active:bg-red-100 transition">Cancel Job</button>
        </div>
      )}

      <div className="fixed bottom-6 left-6 right-6 bg-[#262626]/95 backdrop-blur-xl h-20 rounded-[30px] shadow-2xl flex justify-around items-center px-4 border border-[#333] z-50">
        <Link href="/driver" className="flex flex-col items-center gap-1 text-[#FFD217]"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /></svg><span className="text-[9px] font-black uppercase">Dashboard</span></Link>
        <Link href="/driver/earnings" className="flex flex-col items-center gap-1 text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg><span className="text-[9px] font-black uppercase">Earnings</span></Link>
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-gray-600 active:scale-90 transition"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg><span className="text-[9px] font-black uppercase">Logout</span></button>
      </div>

      {showChat && <ChatModal bookingId={activeTrip.id} senderId={driver.id} onClose={() => setShowChat(false)} />}
    </div>
  );
}
