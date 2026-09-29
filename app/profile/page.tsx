"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState({ balance: 0.00, totalTrips: 0 }); // Changed 'trips' to 'totalTrips'
  const [loading, setLoading] = useState(true);

  const fetchRealTimeData = async () => {
    const sessionStr = localStorage.getItem('etekisi_session');
    if (!sessionStr) {
      window.location.href = "/login";
      return;
    }
    
    const session = JSON.parse(sessionStr);
    const rolePath = session.role === 'DRIVER' ? 'driver' : 'commuter';

    try {
      // 1. Fetch User/Driver Profile Data
      const userRes = await fetch(`http://localhost:8080/api/auth/${rolePath}/${session.userId}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData); // This sets the real-time data from DB
      }

      // 2. Fetch Wallet Data
      const walletRes = await fetch(`http://localhost:8080/api/wallet/${session.userId}?role=${session.role}`);
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setWallet(walletData);
      }
    } catch (err) {
      console.error("Real-time sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Run immediately on load
    fetchRealTimeData();

    // REAL-TIME LOGIC: Refresh data from database every 10 seconds
    const interval = setInterval(fetchRealTimeData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !user) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#FFD217] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Syncing with Database...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white p-6 pb-24 font-sans">
      {/* Top Header */}
      <div className="flex justify-between items-center w-full mb-8">
        <Link href={user?.taxiPlate ? "/driver" : "/"} className="p-2 bg-gray-50 rounded-xl">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="font-black text-lg uppercase tracking-tighter">Live Profile</h2>
        </div>
        <button onClick={() => {localStorage.clear(); window.location.href="/login"}} className="text-red-500 font-bold text-xs uppercase">Logout</button>
      </div>

      {/* Profile Header - REFLECTING REAL-TIME DB DATA */}
      <div className="flex flex-col items-center">
        <div className="w-32 h-32 bg-[#FFD217] rounded-full flex items-center justify-center text-5xl font-black shadow-xl border-4 border-white uppercase">
          {user?.fullName?.charAt(0)}
        </div>
        
        {/* THE LINES YOU ASKED TO CHANGE: */}
        <h1 className="text-3xl font-black mt-6 text-[#1A1A1A]">
            {user?.fullName} 
        </h1>
        <p className="text-gray-400 font-bold">
            {user?.email}
        </p>

        <span className="mt-4 bg-black text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-[0.2em]">
          {user?.taxiPlate ? 'Verified Driver' : 'Verified Commuter'}
        </span>
      </div>

      {/* Stats Section */}
      <div className="flex justify-between w-full mt-10 px-4 bg-gray-50 p-7 rounded-[40px] border border-gray-100 shadow-inner">
        <Stat label="TRIPS" value={wallet.totalTrips} />
        <div className="w-[1px] bg-gray-200 h-10 self-center"></div>
        <Stat label="RATING" value="5.0" />
        <div className="w-[1px] bg-gray-200 h-10 self-center"></div>
        <Stat label="WALLET" value={`R${wallet.balance.toFixed(2)}`} />
      </div>

      {/* Menu List */}
      <div className="mt-10 space-y-3">
        <Link href="/wallet">
          <MenuItem 
            label="Wallet & Payments" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12V2.25h-18V12m18 0v7.5c0 .621-.504 1.125-1.125 1.125H4.125C3.504 20.625 3 20.121 3 19.5V12m18 0h-3.375a1.125 1.125 0 0 1-1.125-1.125V12m0 0h-6.75V10.875c0-.621.504-1.125 1.125-1.125H16.5V12Z" /></svg>} 
          />
        </Link>
        <Link href="/history">
          <MenuItem 
            label="Trip History" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>} 
          />
        </Link>
        <MenuItem 
          label="Saved Ranks" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>} 
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: any) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-black text-gray-400 tracking-[0.2em] mb-1">{label}</p>
      <p className="text-xl font-black text-[#1A1A1A]">{value}</p>
    </div>
  );
}

function MenuItem({ label, icon }: any) {
  return (
    <div className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[28px] shadow-sm active:bg-gray-50 transition mb-3">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-gray-50 rounded-2xl text-gray-600">{icon}</div>
        <span className="font-black text-sm text-gray-800 tracking-tight">{label}</span>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4 text-gray-300">
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </div>
  );
}