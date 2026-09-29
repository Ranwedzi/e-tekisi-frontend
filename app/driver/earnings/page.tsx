"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DriverEarnings() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = async () => {
    // 1. Get session to find current driver ID
    const sessionStr = localStorage.getItem('etekisi_session');
    if (!sessionStr) {
      window.location.href = "/login";
      return;
    }
    const session = JSON.parse(sessionStr);

    try {
      // 2. Fetch from the robust backend endpoint we just updated
      const res = await fetch(`http://localhost:8080/api/bookings/driver/${session.userId}/earnings`);
      
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        console.error("Server returned an error for earnings");
      }
    } catch (error) {
      console.error("Network error fetching earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#FFD217] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white font-sans p-6 pb-20">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-10">
        <Link href="/driver" className="p-3 bg-[#262626] rounded-2xl text-[#FFD217] active:scale-90 transition shadow-lg border border-[#333]">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-2xl font-black uppercase tracking-tighter">My Earnings</h1>
      </div>

      {/* MAIN BALANCE CARD */}
      <div className="bg-[#FFD217] text-black p-10 rounded-[40px] shadow-2xl flex flex-col items-center mb-8 relative overflow-hidden border-4 border-[#e6bd15]">
        {/* Decorative Background Element */}
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black/5 rounded-full"></div>
        
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Available for Payout</p>
        <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black">R</span>
            <h2 className="text-6xl font-black tracking-tighter">
                {data?.totalEarnings?.toFixed(2) || "0.00"}
            </h2>
        </div>
        
        <button className="mt-8 bg-black text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition hover:bg-gray-900">
          Request Payout
        </button>
      </div>

      {/* QUICK STATS ROW */}
      <div className="bg-[#262626] p-7 rounded-[32px] border border-[#333] mb-10 flex justify-around items-center shadow-inner">
        <div className="text-center">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Trips Done</p>
            <p className="text-2xl font-black">{data?.tripCount || 0}</p>
        </div>
        <div className="w-[1px] h-10 bg-[#333]"></div>
        <div className="text-center">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Avg. Per Trip</p>
            <p className="text-2xl font-black text-[#FFD217]">
                R{data?.tripCount > 0 ? (data.totalEarnings / data.tripCount).toFixed(2) : "0.00"}
            </p>
        </div>
      </div>

      {/* TRIP HISTORY LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2 mb-4">
            <h3 className="font-black text-gray-500 uppercase text-[10px] tracking-widest">Recent Activity</h3>
            <span className="text-[9px] font-bold text-[#FFD217] uppercase">View All</span>
        </div>
        
        {data?.history?.length > 0 ? data.history.map((trip: any) => (
          <div key={trip.id} className="bg-[#262626] p-6 rounded-[32px] flex justify-between items-center border border-[#333] shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#1A1A1A] rounded-2xl text-[#FFD217] border border-[#333]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.806H8.044a2.056 2.056 0 0 0-1.58.806c-1.22 1.534-2.18 3.265-2.845 5.122m14.547 4.071a1.875 1.875 0 1 1-3.75 0m3.75 0V14.25m-8.25 4.5V14.25M6.75 14.25H19.5" />
                </svg>
              </div>
              <div>
                <p className="font-black text-sm leading-tight">{trip.destination}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-tighter">
                    {trip.scheduledTime ? trip.scheduledTime.replace('T', ' ') : 'Completed Trip'}
                </p>
              </div>
            </div>
            <div className="text-right">
                <p className="font-black text-[#FFD217] text-lg tracking-tighter">R{trip.fare?.toFixed(2) || "0.00"}</p>
                <div className="flex items-center justify-end gap-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <p className="text-[8px] font-black text-green-500 uppercase tracking-widest">Settled</p>
                </div>
            </div>
          </div>
        )) : (
          <div className="bg-[#262626] p-16 rounded-[40px] border-2 border-dashed border-[#333] text-center flex flex-col items-center gap-4">
            <div className="p-4 bg-[#1A1A1A] rounded-full text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
            </div>
            <p className="text-gray-500 font-bold text-sm tracking-tight">You haven't completed any trips yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}