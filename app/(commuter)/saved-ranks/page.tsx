"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuthedSession } from "../../components/RequireAuth";
import { useConfirm, useToast } from "../../components/Feedback";
import { BackIcon, PinIcon, TrashIcon } from "../../components/Icons";
import { apiFetch, errorMessage } from "../../lib/api";
import { usePolling } from "../../lib/usePolling";
import type { SavedRank } from "../../lib/types";

export default function SavedRanksPage() {
  const session = useAuthedSession();
  const toast = useToast();
  const confirm = useConfirm();
  const [ranks, setRanks] = useState<SavedRank[] | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => setRanks(await apiFetch<SavedRank[]>(`/api/saved-ranks/${session.userId}`));
  usePolling(load, 60_000);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      toast.error("Give the place a name and an address.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/saved-ranks/${session.userId}`, { method: "POST", body: { name: name.trim(), address: address.trim() } });
      setName("");
      setAddress("");
      toast.success("Saved.");
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (rank: SavedRank) => {
    if (!(await confirm({ title: `Remove ${rank.name}?`, confirmLabel: "Remove", danger: true }))) return;
    try {
      await apiFetch(`/api/saved-ranks/${rank.id}`, { method: "DELETE" });
      setRanks((list) => list?.filter((r) => r.id !== rank.id) ?? null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6 font-sans">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/profile" className="p-3 bg-white rounded-2xl shadow-sm" aria-label="Back">
          <BackIcon />
        </Link>
        <h1 className="text-2xl font-black">Saved Ranks</h1>
      </div>

      <form onSubmit={add} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 mb-8 space-y-3">
        <input
          aria-label="Name"
          placeholder="Name (e.g. Home, Work)"
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold"
        />
        <input
          aria-label="Rank or address"
          placeholder="Rank or address (e.g. Bree Taxi Rank)"
          maxLength={300}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold"
        />
        <button type="submit" disabled={saving} className="w-full bg-black text-[#FFD217] py-4 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-60">
          {saving ? "Saving..." : "Save place"}
        </button>
      </form>

      <div className="space-y-3">
        {ranks === null && <p className="text-center py-10 text-gray-400 font-bold">Loading...</p>}
        {ranks?.length === 0 && <p className="text-center py-10 text-gray-400 font-bold">No saved places yet.</p>}
        {ranks?.map((r) => (
          <div key={r.id} className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-2.5 bg-[#FFD217] rounded-2xl text-black shrink-0">
                <PinIcon />
              </div>
              <div className="min-w-0">
                <p className="font-black text-sm truncate">{r.name}</p>
                <p className="text-xs font-bold text-gray-400 truncate">{r.address}</p>
              </div>
            </div>
            <button onClick={() => remove(r)} aria-label={`Remove ${r.name}`} className="p-2 text-gray-400 hover:text-red-500 shrink-0">
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
