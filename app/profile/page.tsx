"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireAuth, useAuthedSession } from "../components/RequireAuth";
import { BackIcon, ChevronIcon, ClockIcon, MoneyIcon, PinIcon, QueueIcon, WalletIcon } from "../components/Icons";
import { Spinner } from "../components/Spinner";
import { apiFetch } from "../lib/api";
import { clearSession, homeFor } from "../lib/session";
import { usePolling } from "../lib/usePolling";
import type { Commuter, Driver, Wallet } from "../lib/types";

export default function ProfilePage() {
  return (
    <RequireAuth roles={["COMMUTER", "DRIVER"]}>
      <Profile />
    </RequireAuth>
  );
}

type ProfileData =
  | { kind: "commuter"; user: Commuter; wallet: Wallet }
  | { kind: "driver"; user: Driver };

function Profile() {
  const session = useAuthedSession();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);

  usePolling(async () => {
    if (session.role === "DRIVER") {
      setData({ kind: "driver", user: await apiFetch<Driver>(`/api/auth/driver/${session.userId}`) });
    } else {
      const [user, wallet] = await Promise.all([
        apiFetch<Commuter>(`/api/auth/commuter/${session.userId}`),
        apiFetch<Wallet>(`/api/wallet/${session.userId}`),
      ]);
      setData({ kind: "commuter", user, wallet });
    }
  }, 15_000);

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  if (!data) return <Spinner label="Loading profile" />;

  const stats =
    data.kind === "driver"
      ? [
          { label: "TRIPS", value: String(data.user.tripsCompleted) },
          { label: "BALANCE", value: `R${data.user.balance.toFixed(2)}` },
          { label: "PLATE", value: data.user.taxiPlate },
        ]
      : [
          { label: "TRIPS", value: String(data.wallet.totalTrips) },
          { label: "WALLET", value: `R${data.wallet.balance.toFixed(2)}` },
        ];

  return (
    <div className="min-h-screen bg-white p-6 pb-24 font-sans">
      <div className="flex justify-between items-center w-full mb-8">
        <Link href={homeFor(session.role)} className="p-2 bg-gray-50 rounded-xl" aria-label="Back">
          <BackIcon />
        </Link>
        <h2 className="font-black text-lg uppercase tracking-tighter">Profile</h2>
        <button onClick={logout} className="text-red-500 font-bold text-xs uppercase">
          Logout
        </button>
      </div>

      <div className="flex flex-col items-center">
        <div className="w-32 h-32 bg-[#FFD217] rounded-full flex items-center justify-center text-5xl font-black shadow-xl border-4 border-white uppercase">
          {data.user.fullName.charAt(0)}
        </div>
        <h1 className="text-3xl font-black mt-6 text-[#1A1A1A]">{data.user.fullName}</h1>
        <p className="text-gray-400 font-bold">{data.user.email}</p>
        <span className="mt-4 bg-black text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-[0.2em]">
          {data.kind === "driver" ? "Driver" : "Commuter"}
        </span>
      </div>

      <div className="flex justify-around w-full mt-10 px-4 bg-gray-50 p-7 rounded-[40px] border border-gray-100 shadow-inner">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-[9px] font-black text-gray-400 tracking-[0.2em] mb-1">{s.label}</p>
            <p className="text-xl font-black text-[#1A1A1A]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-3">
        {data.kind === "commuter" ? (
          <>
            <MenuItem href="/wallet" label="Wallet & Payments" icon={<WalletIcon />} />
            <MenuItem href="/history" label="Trip History" icon={<ClockIcon />} />
            <MenuItem href="/saved-ranks" label="Saved Ranks" icon={<PinIcon />} />
          </>
        ) : (
          <>
            <MenuItem href="/driver/earnings" label="Earnings & Payouts" icon={<MoneyIcon />} />
            <MenuItem href="/driver/queue" label="Queue Manager" icon={<QueueIcon strokeWidth={2} />} />
          </>
        )}
      </div>
    </div>
  );
}

function MenuItem({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[28px] shadow-sm active:bg-gray-50 transition">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-gray-50 rounded-2xl text-gray-600">{icon}</div>
        <span className="font-black text-sm text-gray-800 tracking-tight">{label}</span>
      </div>
      <ChevronIcon className="w-4 h-4 text-gray-300" />
    </Link>
  );
}
