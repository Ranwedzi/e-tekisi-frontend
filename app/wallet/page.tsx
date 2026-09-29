"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchWallet = async () => {
    const sessionStr = localStorage.getItem('etekisi_session');
    if (!sessionStr) { window.location.href = "/login"; return; }
    const session = JSON.parse(sessionStr);

    try {
      const res = await fetch(`http://localhost:8080/api/wallet/${session.userId}?role=${session.role}`);
      if (res.ok) setWallet(await res.json());
    } catch (error) { console.error(error); } 
    finally { setFetching(false); }
  };

  useEffect(() => { fetchWallet(); }, []);

  const handleTopUp = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) return alert("Enter a valid amount");
    setLoading(true);
    const session = JSON.parse(localStorage.getItem('etekisi_session') || '{}');
    
    try {
      const res = await fetch(`http://localhost:8080/api/wallet/${session.userId}/topup?role=${session.role}&amount=${numAmount}`, {
        method: 'POST'
      });
      if (res.ok) {
        alert(`R${numAmount} added successfully!`);
        setAmount("");
        fetchWallet();
      }
    } catch (error) { alert("Error connecting to backend"); } 
    finally { setLoading(false); }
  };

  if (fetching) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#FFD217] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-white p-6 font-sans pb-10">
      <div className="flex items-center justify-between mb-10">
        <Link href="/profile" className="p-3 bg-gray-50 rounded-2xl shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        </Link>
        <h1 className="text-xl font-black uppercase tracking-tighter">My Wallet</h1>
        <div className="w-12"></div>
      </div>

      <div className="bg-[#FFD217] p-10 rounded-[40px] shadow-2xl mb-12 text-black relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-black/5 rounded-full"></div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">Available Balance</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black">R</span>
            {/* FIX: Double optional chaining prevents the 'undefined' crash */}
            <h2 className="text-6xl font-black tracking-tighter">
              {wallet?.balance?.toFixed(2) ?? "0.00"}
            </h2>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-3">
          {["50", "100", "200"].map(val => (
            <button key={val} onClick={() => setAmount(val)} className={`py-5 rounded-2xl font-black border-2 transition ${amount === val ? 'bg-black text-white border-black' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>R{val}</button>
          ))}
        </div>
        <input type="number" placeholder="0.00" value={amount} className="w-full p-6 bg-gray-50 rounded-[28px] border border-gray-100 outline-none font-black text-xl" onChange={(e) => setAmount(e.target.value)} />
        <button onClick={handleTopUp} disabled={loading} className="w-full bg-black text-white py-6 rounded-[28px] font-black text-lg shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50">
          {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "CONFIRM TOP-UP"}
        </button>
      </div>
    </div>
  );
}