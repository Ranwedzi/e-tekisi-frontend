"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuthedSession } from "../../components/RequireAuth";
import { useToast } from "../../components/Feedback";
import { BackIcon, MoneyIcon, TaxiIcon } from "../../components/Icons";
import { DriverNav } from "../../components/Nav";
import { Spinner } from "../../components/Spinner";
import { apiFetch, errorMessage, newIdempotencyKey } from "../../lib/api";
import { usePolling } from "../../lib/usePolling";
import type { Earnings, Payout, PayoutMethod, PayoutLimits } from "../../lib/types";

const METHODS: { value: PayoutMethod; label: string }[] = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "FNB_EWALLET", label: "FNB eWallet" },
  { value: "CAPITEC_CASH_SEND", label: "Capitec Cash Send" },
];
const MIN_PAYOUT = 20;

export default function DriverEarnings() {
  const session = useAuthedSession();
  const [data, setData] = useState<Earnings | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [limits, setLimits] = useState<PayoutLimits | null>(null);

  const load = async () => {
    const [e, p, l] = await Promise.all([
      apiFetch<Earnings>(`/api/bookings/driver/${session.userId}/earnings`),
      apiFetch<Payout[]>(`/api/payouts/driver/${session.userId}`),
      apiFetch<PayoutLimits>(`/api/payouts/driver/${session.userId}/limits`).catch(() => null),
    ]);
    setData(e);
    setPayouts(p);
    setLimits(l);
  };
  usePolling(load, 30_000);

  if (!data) return <Spinner dark />;

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white font-sans p-6 pb-32">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/driver" className="p-3 bg-[#262626] rounded-2xl text-[#FFD217] active:scale-90 transition shadow-lg border border-[#333]" aria-label="Back">
          <BackIcon />
        </Link>
        <h1 className="text-2xl font-black uppercase tracking-tighter">My Earnings</h1>
      </div>

      <div className="bg-[#FFD217] text-black p-10 rounded-[40px] shadow-2xl flex flex-col items-center mb-8 relative overflow-hidden border-4 border-[#e6bd15]">
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black/5 rounded-full" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Available for Payout</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black">R</span>
          <h2 className="text-6xl font-black tracking-tighter">{data.availableBalance.toFixed(2)}</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={data.availableBalance < MIN_PAYOUT}
          className="mt-8 bg-black text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition hover:bg-gray-900 disabled:opacity-50"
        >
          Request Payout
        </button>
        {data.availableBalance < MIN_PAYOUT && <p className="text-[11px] font-bold opacity-60 mt-3">Minimum payout is R{MIN_PAYOUT}.</p>}
        {limits && (
          <p className="text-[11px] font-bold opacity-60 mt-2">
            You can cash out up to R{limits.payoutToday.toFixed(2)} more today ({limits.payoutsLeftToday} request
            {limits.payoutsLeftToday === 1 ? "" : "s"} left).
          </p>
        )}
      </div>

      <div className="bg-[#262626] p-7 rounded-[32px] border border-[#333] mb-10 flex justify-around items-center shadow-inner">
        <Stat label="Trips Done" value={String(data.tripCount)} />
        <div className="w-[1px] h-10 bg-[#333]" />
        <Stat label="Total Earned" value={`R${data.totalEarnings.toFixed(2)}`} highlight />
        <div className="w-[1px] h-10 bg-[#333]" />
        <Stat label="Avg / Trip" value={`R${data.tripCount > 0 ? (data.totalEarnings / data.tripCount).toFixed(2) : "0.00"}`} />
      </div>

      {payouts.length > 0 && (
        <section className="mb-10">
          <h3 className="font-black text-gray-500 uppercase text-[10px] tracking-widest px-2 mb-4">Payout Requests</h3>
          <div className="space-y-3">
            {payouts.map((p) => (
              <div key={p.id} className="bg-[#262626] p-5 rounded-[28px] border border-[#333] flex justify-between items-center">
                <div>
                  <p className="font-black text-sm">{METHODS.find((m) => m.value === p.method)?.label ?? p.method}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">
                    {p.accountNumberMasked ?? p.phoneNumberMasked ?? ""} {p.createdAt ? `· ${new Date(p.createdAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-[#FFD217]">R{p.amount.toFixed(2)}</p>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${p.status === "REJECTED" ? "text-red-400" : p.status === "PAID" ? "text-green-400" : "text-gray-400"}`}>
                    {p.status === "REJECTED" ? "Declined · refunded" : p.status}
                  </p>
                  {p.rejectionReason && <p className="text-[10px] font-bold text-gray-500 max-w-[10rem]">{p.rejectionReason}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="font-black text-gray-500 uppercase text-[10px] tracking-widest px-2 mb-4">Completed Trips</h3>
        {data.history.length > 0 ? (
          data.history.map((trip) => (
            <div key={trip.id} className="bg-[#262626] p-6 rounded-[32px] flex justify-between items-center border border-[#333] shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#1A1A1A] rounded-2xl text-[#FFD217] border border-[#333]">
                  <TaxiIcon />
                </div>
                <div>
                  <p className="font-black text-sm leading-tight">{trip.destination}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-tighter">from {trip.pickupLocation}</p>
                </div>
              </div>
              <p className="font-black text-[#FFD217] text-lg tracking-tighter">R{((trip.fare ?? 0) + (trip.tip ?? 0)).toFixed(2)}</p>
            </div>
          ))
        ) : (
          <div className="bg-[#262626] p-16 rounded-[40px] border-2 border-dashed border-[#333] text-center flex flex-col items-center gap-4">
            <div className="p-4 bg-[#1A1A1A] rounded-full text-gray-700">
              <MoneyIcon className="w-8 h-8" />
            </div>
            <p className="text-gray-500 font-bold text-sm tracking-tight">You haven&apos;t completed any trips yet.</p>
          </div>
        )}
      </section>

      {showForm && (
        <PayoutForm
          driverId={session.userId}
          available={data.availableBalance}
          onClose={() => setShowForm(false)}
          onDone={async () => {
            setShowForm(false);
            await load();
          }}
        />
      )}

      <DriverNav current="earnings" />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-black ${highlight ? "text-[#FFD217]" : ""}`}>{value}</p>
    </div>
  );
}

function PayoutForm({ driverId, available, onClose, onDone }: { driverId: number; available: number; onClose: () => void; onDone: () => Promise<void> }) {
  const toast = useToast();
  const [method, setMethod] = useState<PayoutMethod>("BANK_TRANSFER");
  const [amount, setAmount] = useState(String(Math.floor(available)));
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < MIN_PAYOUT) return setError(`Minimum payout is R${MIN_PAYOUT}.`);
    if (value > available) return setError(`You have R${available.toFixed(2)} available.`);
    if (method === "BANK_TRANSFER" && (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim())) {
      return setError("Enter the bank, account number and account holder.");
    }
    if (method !== "BANK_TRANSFER" && !phoneNumber.trim()) return setError("Enter the phone number to send to.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/payouts/driver/${driverId}/request`, {
        method: "POST",
        idempotencyKey: newIdempotencyKey(),
        body: {
          amount: value,
          method,
          ...(method === "BANK_TRANSFER" ? { bankName, accountNumber, accountHolder } : { phoneNumber }),
        },
      });
      toast.success(`Payout of R${value.toFixed(2)} requested.`);
      await onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const field = "w-full p-4 bg-[#1A1A1A] rounded-2xl outline-none font-bold border border-[#333] focus:border-[#FFD217]";

  return (
    <div className="fixed inset-0 bg-black/80 z-[3000] flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="payout-title">
      <form onSubmit={submit} className="w-full max-w-sm bg-[#262626] text-white rounded-[32px] p-6 shadow-2xl border border-[#333] space-y-3">
        <h2 id="payout-title" className="text-xl font-black">Request payout</h2>
        <select aria-label="Payout method" value={method} onChange={(e) => setMethod(e.target.value as PayoutMethod)} className={field}>
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <input aria-label="Amount" type="number" inputMode="decimal" min={MIN_PAYOUT} max={available} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} placeholder="Amount (R)" />
        {method === "BANK_TRANSFER" ? (
          <>
            <input aria-label="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} className={field} placeholder="Bank (e.g. FNB)" />
            <input aria-label="Account number" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={field} placeholder="Account number" />
            <input aria-label="Account holder" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className={field} placeholder="Account holder" />
          </>
        ) : (
          <input aria-label="Phone number" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={field} placeholder="Phone number" />
        )}
        {error && <p role="alert" className="text-sm font-bold text-red-400">{error}</p>}
        <div className="grid grid-cols-2 gap-3 pt-3">
          <button type="button" onClick={onClose} className="py-4 rounded-2xl bg-[#333] font-black text-xs uppercase tracking-widest">
            Back
          </button>
          <button type="submit" disabled={submitting} className="py-4 rounded-2xl bg-[#FFD217] text-black font-black text-xs uppercase tracking-widest disabled:opacity-60">
            {submitting ? "Sending..." : "Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
