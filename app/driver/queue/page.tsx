"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuthedSession } from "../../components/RequireAuth";
import { useToast } from "../../components/Feedback";
import { BackIcon, QueueIcon, RefreshIcon } from "../../components/Icons";
import { apiFetch, errorMessage } from "../../lib/api";
import { usePolling } from "../../lib/usePolling";
import { useLivePolling } from "../../lib/live";
import type { QueueTicket, TaxiRank } from "../../lib/types";
import { useT } from "../../lib/i18n";

export default function RankQueue() {
  const session = useAuthedSession();
  const toast = useToast();
  const [ranks, setRanks] = useState<TaxiRank[] | null>(null);
  const [selectedRank, setSelectedRank] = useState("");
  const [customRank, setCustomRank] = useState("");
  const [rankList, setRankList] = useState<QueueTicket[]>([]);
  const [acting, setActing] = useState(false);
  const tr = useT();

  const fetchRanks = async () => {
    const list = await apiFetch<TaxiRank[]>("/api/queue/ranks");
    setRanks(list);
    setSelectedRank((current) => current || list[0]?.name || "");
  };
  usePolling(fetchRanks, 5 * 60_000);

  const fetchQueue = async () => {
    if (!selectedRank) return;
    setRankList(await apiFetch<QueueTicket[]>(`/api/queue/status/${encodeURIComponent(selectedRank)}`));
  };
  useLivePolling(fetchQueue, ["queue"], 5000, 30_000, !!selectedRank);

  const myTicket = rankList.find((t) => t.driverId === session.userId) ?? null;
  const waiting = rankList.filter((t) => t.status === "WAITING");
  const myPosition = waiting.findIndex((t) => t.driverId === session.userId) + 1;

  const run = async (fn: () => Promise<unknown>, success?: string) => {
    setActing(true);
    try {
      await fn();
      if (success) toast.success(success);
      await fetchQueue();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const joinQueue = () =>
    run(async () => {
      const ticket = await apiFetch<QueueTicket>("/api/queue/join", { method: "POST", body: { taxiRank: selectedRank } });
      if (ticket.taxiRank !== selectedRank) {
        toast.info(tr("queue.alreadyIn", { rank: ticket.taxiRank }));
        setSelectedRank(ticket.taxiRank);
      }
    });

  const handleAction = (action: "skip" | "serve" | "complete") =>
    myTicket && run(() => apiFetch(`/api/queue/${action}/${myTicket.id}`, { method: "PUT" }), action === "complete" ? tr("queue.safeTravels") : undefined);

  const chooseCustomRank = (e: FormEvent) => {
    e.preventDefault();
    if (customRank.trim()) {
      setSelectedRank(customRank.trim());
      setCustomRank("");
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white font-sans p-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <Link href="/driver" className="p-3 bg-[#262626] rounded-2xl text-[#FFD217]" aria-label={tr("common.backLabel")}>
          <BackIcon />
        </Link>
        <h1 className="text-xl font-black uppercase tracking-widest text-[#FFD217]">{tr("nav.queue")}</h1>
        <button onClick={() => run(fetchRanks)} aria-label={tr("queue.refresh")} className="p-3 bg-[#262626] rounded-2xl text-gray-500 active:rotate-180 transition-transform duration-500">
          <RefreshIcon className="w-5 h-5" />
        </button>
      </div>

      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">{tr("queue.ranks")}</p>
      <div className="mb-4">
        {ranks === null ? (
          <div className="bg-[#262626] p-6 rounded-[32px] border border-dashed border-[#444] flex items-center justify-center gap-3">
            <div className="w-4 h-4 border-2 border-[#FFD217] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-gray-400 animate-pulse">{tr("queue.loading")}</span>
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[...ranks.map((r) => r.name), ...(selectedRank && !ranks.some((r) => r.name === selectedRank) ? [selectedRank] : [])].map((name) => (
              <button
                key={name}
                onClick={() => setSelectedRank(name)}
                className={`whitespace-nowrap px-6 py-4 rounded-[24px] font-black text-xs transition-all ${selectedRank === name ? "bg-[#FFD217] text-black shadow-lg shadow-yellow-500/20" : "bg-[#262626] text-gray-500 border border-[#333]"}`}
              >
                {name.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={chooseCustomRank} className="flex gap-2 mb-8">
        <input
          aria-label={tr("queue.rankName")}
          value={customRank}
          maxLength={200}
          onChange={(e) => setCustomRank(e.target.value)}
          placeholder={tr("queue.notListed")}
          className="flex-1 p-4 bg-[#262626] rounded-2xl outline-none font-bold text-sm border border-[#333]"
        />
        <button type="submit" className="px-5 rounded-2xl bg-[#333] font-black text-xs uppercase">{tr("queue.use")}</button>
      </form>

      {selectedRank && (
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4">
          {myTicket ? (
            <div className={`p-8 rounded-[40px] shadow-2xl flex flex-col items-center border-4 ${myTicket.status === "SERVING" ? "bg-green-600 border-green-400" : "bg-[#FFD217] border-[#e6bd15] text-black"}`}>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{tr("queue.position")}</p>
              <h2 className="text-7xl font-black my-2">{myTicket.status === "SERVING" ? tr("queue.go") : `#${myPosition}`}</h2>
              <p className="font-bold opacity-80">{selectedRank}</p>

              <div className="grid grid-cols-2 gap-3 w-full mt-8">
                {myPosition === 1 && myTicket.status === "WAITING" && (
                  <button disabled={acting} onClick={() => handleAction("serve")} className="bg-black text-white py-4 rounded-2xl font-black text-xs shadow-xl disabled:opacity-60">
                    {tr("queue.startLoading")}
                  </button>
                )}
                {myTicket.status === "SERVING" && (
                  <button disabled={acting} onClick={() => handleAction("complete")} className="col-span-2 bg-white text-black py-4 rounded-2xl font-black text-xs shadow-xl disabled:opacity-60">
                    {tr("queue.finish")}
                  </button>
                )}
                {myTicket.status === "WAITING" && (
                  <button disabled={acting} onClick={() => handleAction("skip")} className="bg-white/30 text-black py-4 rounded-2xl font-black text-xs disabled:opacity-60">
                    {tr("queue.skip")}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button disabled={acting} onClick={joinQueue} className="w-full py-12 bg-[#262626] border-2 border-dashed border-[#444] rounded-[40px] flex flex-col items-center gap-3 active:scale-[0.98] transition disabled:opacity-60">
              <div className="p-4 bg-[#FFD217] rounded-full text-black shadow-lg">
                <QueueIcon className="w-8 h-8" />
              </div>
              <span className="font-black text-lg">{tr("queue.join", { rank: selectedRank.toUpperCase() })}</span>
            </button>
          )}
        </div>
      )}

      {selectedRank && (
        <>
          <h3 className="font-black text-gray-500 uppercase text-[10px] tracking-widest mb-4 ml-2">{tr("queue.activity")}</h3>
          <div className="space-y-3">
            {rankList.length === 0 && <p className="text-sm font-bold text-gray-500 ml-2">{tr("queue.empty")}</p>}
            {rankList.map((t, index) => (
              <div key={t.id} className={`p-5 rounded-[24px] flex justify-between items-center ${t.driverId === session.userId ? "bg-[#333] border border-[#FFD217]" : "bg-[#262626]"}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${t.status === "SERVING" ? "bg-green-500" : "bg-[#1A1A1A] text-gray-500"}`}>
                    {t.status === "SERVING" ? tr("queue.go") : index + 1 - rankList.filter((x) => x.status === "SERVING").length}
                  </span>
                  <div>
                    <p className="font-bold text-sm">{t.driverName}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase">{t.status === "SERVING" ? tr("queue.loadingStatus") : tr("queue.waitingStatus")}</p>
                  </div>
                </div>
                {t.status === "SERVING" && <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
