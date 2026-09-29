"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { clearSession } from "../lib/session";
import { useUnreadCount } from "../lib/useUnreadCount";
import { BellIcon, ClockIcon, GridIcon, HomeIcon, LogoutIcon, MoneyIcon, UserIcon } from "./Icons";

function NavItem({ href, label, icon, active, dark }: { href: string; label: string; icon: ReactNode; active: boolean; dark?: boolean }) {
  const color = active ? (dark ? "text-[#FFD217]" : "text-black") : dark ? "text-gray-600" : "text-gray-300";
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 ${color}`} aria-current={active ? "page" : undefined}>
      {icon}
      <span className="text-[9px] font-black tracking-tighter uppercase">{label}</span>
    </Link>
  );
}

export function CommuterNav({ current }: { current: "home" | "book" | "profile" }) {
  return (
    <nav className="fixed bottom-6 left-6 right-6 bg-white/95 backdrop-blur-xl h-20 rounded-[30px] shadow-2xl flex justify-around items-center px-4 z-50 border border-gray-100">
      <NavItem href="/" label="Home" icon={<HomeIcon />} active={current === "home"} />
      <NavItem href="/book" label="Book" icon={<ClockIcon />} active={current === "book"} />
      <NavItem href="/profile" label="Profile" icon={<UserIcon />} active={current === "profile"} />
    </nav>
  );
}

export function DriverNav({ current }: { current: "dashboard" | "earnings" }) {
  const router = useRouter();
  const logout = () => {
    clearSession();
    router.replace("/login");
  };
  return (
    <nav className="fixed bottom-6 left-6 right-6 bg-[#262626]/95 backdrop-blur-xl h-20 rounded-[30px] shadow-2xl flex justify-around items-center px-4 border border-[#333] z-50">
      <NavItem href="/driver" label="Dashboard" icon={<GridIcon />} active={current === "dashboard"} dark />
      <NavItem href="/driver/earnings" label="Earnings" icon={<MoneyIcon />} active={current === "earnings"} dark />
      <button onClick={logout} className="flex flex-col items-center gap-1 text-gray-600 active:scale-90 transition">
        <LogoutIcon />
        <span className="text-[9px] font-black uppercase">Logout</span>
      </button>
    </nav>
  );
}

/** Bell linking to /notifications, with a red dot only when something is unread. */
export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const unread = useUnreadCount();
  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
      className={`p-3 rounded-2xl relative active:scale-90 transition ${dark ? "bg-[#333] text-[#FFD217]" : "bg-gray-50 text-gray-600"}`}
    >
      {unread > 0 && (
        <span className={`absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 ${dark ? "border-[#333]" : "border-white"}`} />
      )}
      <BellIcon />
    </Link>
  );
}
