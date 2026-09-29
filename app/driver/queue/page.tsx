"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RankQueue() {
  const [discoveredRanks, setDiscoveredRanks] = useState<any[]>([]);
  const [rankList, setRankList] = useState([]);
  const [myTicket, setMyTicket] = useState<any>(null);
  const [selectedRank, setSelectedRank] = useState("");
  const [driver, setDriver] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('etekisi_session') || '{}');
    if (!session.userId) { window.location.href = "/login"; return; }

    // 1. Get Driver Info
    fetch(`http://localhost:8080/api/auth/driver/${session.userId}`)
      .then(res => res.json())
      .then(data => setDriver(data));

    // 2. Fetch Ranks Discovered by AI
    fetchRanks();
  }, []);

  const fetchRanks = () => {
    setIsScanning(true);
    fetch('http://localhost:8080/api/queue/ranks')
      .then(res => res.json())
      .then(data => {
        setDiscoveredRanks(data);
        if (data.length > 0) setSelectedRank(data[0].name);
        setIsScanning(false);
      })
      .catch(() => setIsScanning(false));
  };

  useEffect(() => {
    if (selectedRank) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedRank, driver?.id]);

  const fetchQueue = () => {
    fetch(`http://localhost:8080/api/queue/status/${selectedRank}`)
      .then(res => res.json())
      .then(data => {
        setRankList(data);
        setMyTicket(data.find((t: any) => t.driverId === driver?.id));
      });
  };

  const joinQueue = async () => {
    await fetch('http://localhost:8080/api/queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId: driver.id, driverName: driver.fullName, taxiRank: selectedRank }),
    });
    fetchQueue();
  };

  const handleAction = async (action: string) => {
    await fetch(`http://localhost:8080/api/queue/${action}/${myTicket.id}`, { method: 'PUT' });
    if (action === 'complete') setMyTicket(null);
    fetchQueue();
  };

  const myPosition = rankList.findIndex((t: any) => t.driverId === driver?.id) + 1;

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white font-sans p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/driver" className="p-3 bg-[#262626] rounded-2xl text-[#FFD217]">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        </Link>
        <h1 className="text-xl font-black uppercase tracking-widest text-[#FFD217]">Queue Manager</h1>
        <button onClick={fetchRanks} className="p-3 bg-[#262626] rounded-2xl text-gray-500 active:rotate-180 transition-transform duration-500">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
        </button>
      </div>

      {/* AI DISCOVERY TABS */}
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Nearby Ranks </p>
      <div className="mb-8">
        {isScanning ? (
          <div className="bg-[#262626] p-6 rounded-[32px] border border-dashed border-[#444] flex items-center justify-center gap-3">
             <div className="w-4 h-4 border-2 border-[#FFD217] border-t-transparent rounded-full animate-spin"></div>
             <span className="text-xs font-bold text-gray-400 animate-pulse">Scanning surroundings...</span>
          </div>
        ) : discoveredRanks.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {discoveredRanks.map((rank) => (
              <button 
                key={rank.id}
                onClick={() => setSelectedRank(rank.name)}
                className={`whitespace-nowrap px-6 py-4 rounded-[24px] font-black text-xs transition-all ${selectedRank === rank.name ? 'bg-[#FFD217] text-black shadow-lg shadow-yellow-500/20' : 'bg-[#262626] text-gray-500 border border-[#333]'}`}
              >
                {rank.name.toUpperCase()}
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-indigo-900/20 p-6 rounded-[32px] border border-indigo-500/30 text-center">
             <p className="text-xs font-bold text-indigo-300 italic">"No ranks found. Standing by for location updates."</p>
          </div>
        )}
      </div>

      {/* Main Ticket Card */}
      {selectedRank && (
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4">
          {myTicket ? (
            <div className={`p-8 rounded-[40px] shadow-2xl flex flex-col items-center border-4 ${myTicket.status === 'SERVING' ? 'bg-green-600 border-green-400' : 'bg-[#FFD217] border-[#e6bd15] text-black'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Position at Rank</p>
              <h2 className="text-7xl font-black my-2">{myTicket.status === 'SERVING' ? "GO" : `#${myPosition}`}</h2>
              <p className="font-bold opacity-80">{selectedRank}</p>
              
              <div className="grid grid-cols-2 gap-3 w-full mt-8">
                {myPosition === 1 && myTicket.status === 'WAITING' && (
                  <button onClick={() => handleAction('serve')} className="bg-black text-white py-4 rounded-2xl font-black text-xs shadow-xl">START LOADING</button>
                )}
                {myTicket.status === 'SERVING' && (
                  <button onClick={() => handleAction('complete')} className="col-span-2 bg-white text-black py-4 rounded-2xl font-black text-xs shadow-xl">FINISH & DEPART</button>
                )}
                {myTicket.status === 'WAITING' && (
                  <button onClick={() => handleAction('skip')} className="bg-white/30 text-black py-4 rounded-2xl font-black text-xs">SKIP TURN</button>
                )}
              </div>
            </div>
          ) : (
            <button onClick={joinQueue} className="w-full py-12 bg-[#262626] border-2 border-dashed border-[#444] rounded-[40px] flex flex-col items-center gap-3 active:scale-[0.98] transition">
              <div className="p-4 bg-[#FFD217] rounded-full text-black shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12v.75m0 3v.75m0 3v.75m0 3V18m-3-12h15c.621 0 1.125.504 1.125 1.125v10.5c0 .621-.504 1.125-1.125 1.125H4.5c-.621 0-1.125-.504-1.125-1.125V7.125C3.375 6.629 3.879 6.125 4.5 6.125Z" /></svg>
              </div>
              <span className="font-black text-lg">JOIN {selectedRank.toUpperCase()}</span>
            </button>
          )}
        </div>
      )}

      {/* Activity List */}
      {selectedRank && (
        <>
          <h3 className="font-black text-gray-500 uppercase text-[10px] tracking-widest mb-4 ml-2">Rank Activity</h3>
          <div className="space-y-3">
            {rankList.map((t: any, index) => (
              <div key={t.id} className={`p-5 rounded-[24px] flex justify-between items-center ${t.driverId === driver?.id ? 'bg-[#333] border border-[#FFD217]' : 'bg-[#262626]'}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${t.status === 'SERVING' ? 'bg-green-500' : 'bg-[#1A1A1A] text-gray-500'}`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-bold text-sm">{t.driverName}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase">{t.status}</p>
                  </div>
                </div>
                {t.status === 'SERVING' && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-500">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.74-5.24Z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}