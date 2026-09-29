"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuthedSession } from "../../components/RequireAuth";
import { useToast } from "../../components/Feedback";
import { BackIcon } from "../../components/Icons";
import { Spinner } from "../../components/Spinner";
import { ApiError, apiFetch, errorMessage } from "../../lib/api";
import { usePolling } from "../../lib/usePolling";
import type { Wallet } from "../../lib/types";

const MIN_TOPUP = 10;
const MAX_TOPUP = 2000;

export default function WalletPage() {
  const session = useAuthedSession();
  const toast = useToast();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchWallet = async () => setWallet(await apiFetch<Wallet>(`/api/wallet/${session.userId}`));
  usePolling(fetchWallet, 15_000);

  const handleTopUp = async (e: FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!amount || !Number.isFinite(numAmount) || numAmount < MIN_TOPUP || numAmount > MAX_TOPUP) {
      toast.error(`Enter an amount between R${MIN_TOPUP} and R${MAX_TOPUP}.`);
      return;
    }
    setLoading(true);
    try {
      const updated = await apiFetch<Wallet>(`/api/wallet/${session.userId}/topup`, { method: "POST", query: { amount: numAmount } });
      setWallet(updated);
      toast.success(`R${numAmount.toFixed(2)} added to your wallet.`);
      setAmount("");
    } catch (err) {
      toast.error(err instanceof ApiError && err.code === "TOPUP_DISABLED" ? "Top-ups aren't available yet." : errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!wallet) return <Spinner />;

  return (
    <div className="min-h-screen bg-white p-6 font-sans pb-10">
      <div className="flex items-center justify-between mb-10">
        <Link href="/profile" className="p-3 bg-gray-50 rounded-2xl shadow-sm" aria-label="Back">
          <BackIcon />
        </Link>
        <h1 className="text-xl font-black uppercase tracking-tighter">My Wallet</h1>
        <div className="w-12" />
      </div>

      <div className="bg-[#FFD217] p-10 rounded-[40px] shadow-2xl mb-12 text-black relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-black/5 rounded-full" />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">Available Balance</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black">R</span>
            <h2 className="text-6xl font-black tracking-tighter">{wallet.balance.toFixed(2)}</h2>
          </div>
          <p className="text-xs font-bold opacity-60 mt-2">{wallet.totalTrips} trips completed</p>
        </div>
      </div>

      <form onSubmit={handleTopUp} className="space-y-8">
        <div className="grid grid-cols-3 gap-3">
          {["50", "100", "200"].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setAmount(val)}
              className={`py-5 rounded-2xl font-black border-2 transition ${amount === val ? "bg-black text-white border-black" : "bg-gray-50 border-gray-100 text-gray-400"}`}
            >
              R{val}
            </button>
          ))}
        </div>
        <input
          type="number"
          inputMode="decimal"
          min={MIN_TOPUP}
          max={MAX_TOPUP}
          step="0.01"
          aria-label="Top-up amount"
          placeholder="0.00"
          value={amount}
          className="w-full p-6 bg-gray-50 rounded-[28px] border border-gray-100 outline-none font-black text-xl"
          onChange={(e) => setAmount(e.target.value)}
        />
        <p className="text-[11px] font-bold text-gray-400 -mt-4 ml-2">
          R{MIN_TOPUP}–R{MAX_TOPUP} per top-up.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-6 rounded-[28px] font-black text-lg shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "CONFIRM TOP-UP"}
        </button>
      </form>
    </div>
  );
}
