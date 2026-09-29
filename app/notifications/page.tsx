"use client";
import { useState } from "react";
import Link from "next/link";
import { RequireAuth, useAuthedSession } from "../components/RequireAuth";
import { useToast } from "../components/Feedback";
import { BackIcon, BellIcon } from "../components/Icons";
import { apiFetch, errorMessage } from "../lib/api";
import { homeFor } from "../lib/session";
import { usePolling } from "../lib/usePolling";
import type { AppNotification } from "../lib/types";

export default function NotificationsPage() {
  return (
    <RequireAuth roles={["COMMUTER", "DRIVER"]}>
      <Notifications />
    </RequireAuth>
  );
}

function Notifications() {
  const session = useAuthedSession();
  const toast = useToast();
  const [list, setList] = useState<AppNotification[] | null>(null);

  // The backend works out whose notifications these are from the sign-in token.
  const fetchNotifications = async () => setList(await apiFetch<AppNotification[]>("/api/notifications"));
  usePolling(fetchNotifications, 10_000);

  const markRead = async (n: AppNotification) => {
    setList((l) => l?.filter((x) => x.id !== n.id) ?? null);
    try {
      await apiFetch(`/api/notifications/read/${n.id}`, { method: "PUT" });
    } catch (err) {
      toast.error(errorMessage(err));
      await fetchNotifications();
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "PUT" });
      setList([]);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6 font-sans">
      <div className="flex items-center justify-between mb-10">
        <Link href={homeFor(session.role)} className="p-3 bg-white rounded-2xl shadow-sm active:scale-90 transition text-black" aria-label="Back">
          <BackIcon />
        </Link>
        <h1 className="text-xl font-black uppercase tracking-tighter text-[#1A1A1A]">Notifications</h1>
        {list && list.length > 0 ? (
          <button onClick={markAllRead} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Mark all read
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      <div className="space-y-3">
        {list === null ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#FFD217] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Checking for alerts...</p>
          </div>
        ) : list.length > 0 ? (
          list.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n)}
              className="w-full text-left p-5 bg-white rounded-[28px] shadow-sm border border-gray-100 flex gap-4 animate-in fade-in slide-in-from-bottom-2"
              aria-label={`${n.message}. Tap to mark as read.`}
            >
              <div className="w-12 h-12 bg-[#FFD217] rounded-2xl flex items-center justify-center text-black shrink-0 shadow-inner">
                <BellIcon />
              </div>
              <div className="flex flex-col justify-center flex-1">
                <p className="text-sm font-bold text-gray-800 leading-tight">{n.message}</p>
                {n.createdAt && (
                  <p className="text-[9px] font-black text-gray-400 uppercase mt-2 tracking-widest">
                    {new Date(n.createdAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-20 flex flex-col items-center opacity-40">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 mb-4 shadow-inner">
              <BellIcon className="w-10 h-10" />
            </div>
            <p className="text-gray-500 font-black text-xs tracking-widest uppercase">You&apos;re all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
