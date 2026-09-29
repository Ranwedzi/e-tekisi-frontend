"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Notifications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backLink, setBackLink] = useState("/");

  const fetchNotifications = async () => {
    const sessionStr = localStorage.getItem('etekisi_session');
    if (!sessionStr) {
      window.location.href = "/login";
      return;
    }
    const session = JSON.parse(sessionStr);

    // FIX: Back button logic based on real-time session role
    if (session.role === 'DRIVER') {
      setBackLink("/driver");
    } else {
      setBackLink("/");
    }

    try {
      // Fetching real-time notifications for this specific User ID from the DB
      const res = await fetch(`http://localhost:8080/api/notifications/${session.userId}`);
      if (res.ok) {
        const data = await res.json();
        setList(data);
      }
    } catch (error) {
      console.error("Notification sync failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // REAL-TIME LOGIC: Poll the database every 5 seconds for new alerts
    const interval = setInterval(fetchNotifications, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    const sessionStr = localStorage.getItem('etekisi_session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);

    try {
      const res = await fetch(`http://localhost:8080/api/notifications/read-all/${session.userId}`, {
        method: 'PUT'
      });
      if (res.ok) setList([]);
    } catch (e) {
      alert("Failed to clear notifications");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6 font-sans">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-10">
        <Link href={backLink} className="p-3 bg-white rounded-2xl shadow-sm active:scale-90 transition">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-black">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
           </svg>
        </Link>
        <h1 className="text-xl font-black uppercase tracking-tighter text-[#1A1A1A]">Notifications</h1>
        {list.length > 0 ? (
          <button onClick={markAllRead} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Clear All</button>
        ) : <div className="w-10"></div>}
      </div>

      {/* NOTIFICATION LIST */}
      <div className="space-y-3">
        {loading && list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#FFD217] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Checking for alerts...</p>
          </div>
        ) : list.length > 0 ? (
          list.map((n: any) => (
            <div key={n.id} className="p-5 bg-white rounded-[28px] shadow-sm border border-gray-100 flex gap-4 animate-in fade-in slide-in-from-bottom-2">
               <div className="w-12 h-12 bg-[#FFD217] rounded-2xl flex items-center justify-center text-black shrink-0 shadow-inner">
                  {/* Heroicon: Bell */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
               </div>
               <div className="flex flex-col justify-center flex-1">
                  <p className="text-sm font-bold text-gray-800 leading-tight">{n.message}</p>
                  <p className="text-[9px] font-black text-gray-400 uppercase mt-2 tracking-widest">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
               </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 flex flex-col items-center opacity-40">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 mb-4 shadow-inner">
               {/* Heroicon: Bell-Slash */}
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 0 0 3.844.148m-3.844-.148a23.856 23.856 0 0 1-5.455-1.31 8.964 8.964 0 0 1 2.3-5.542m3.155 6.852a3 3 0 0 0 5.667-1.97m1.965 2.273a24.297 24.297 0 0 1-3.827-.125m-9.487-1.446a.75.75 0 1 1 1.5.001 7.5 7.5 0 0 0 1.5 4.5.75.75 0 0 1-1.2 1.2 9 9 0 0 1-1.8-5.701Z" />
               </svg>
            </div>
            <p className="text-gray-500 font-black text-xs tracking-widest uppercase">You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}