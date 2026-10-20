"use client";
import { useState } from "react";
import { apiFetch, errorMessage } from "../lib/api";
import { usePolling } from "../lib/usePolling";
import { useToast } from "./Feedback";

interface Run {
  id: number;
  status: "RUNNING" | "OK" | "WARNINGS" | "DISCREPANCIES" | "FAILED";
  startedAt: string;
  finishedAt: string | null;
  triggeredBy: string;
  criticalCount: number;
  warningCount: number;
  ledgerRows: number;
  topups: number;
  openingBalances: number;
  walletBalances: number;
  driverBalances: number;
  inFlight: number;
  paidOut: number;
  error: string | null;
}

interface Finding {
  id: number;
  severity: "CRITICAL" | "WARNING";
  code: string;
  ownerRole: string | null;
  ownerId: number | null;
  bookingId: number | null;
  payoutId: number | null;
  ledgerId: number | null;
  detail: string;
}

const R = (n: number) => `R${Number(n).toFixed(2)}`;

const TONE: Record<Run["status"], string> = {
  OK: "bg-green-50 text-green-800 border-green-200",
  WARNINGS: "bg-yellow-50 text-yellow-900 border-yellow-200",
  DISCREPANCIES: "bg-red-50 text-red-800 border-red-200",
  FAILED: "bg-red-50 text-red-800 border-red-200",
  RUNNING: "bg-gray-50 text-gray-700 border-gray-200",
};

const HEADLINE: Record<Run["status"], string> = {
  OK: "The books balance",
  WARNINGS: "The books balance, with notes",
  DISCREPANCIES: "Money doesn't add up",
  FAILED: "The check didn't finish",
  RUNNING: "Checking…",
};

/** The latest daily money check: totals, what didn't add up, and "check now". */
export function Reconciliation() {
  const toast = useToast();
  const [data, setData] = useState<{ run: Run | null; findings?: Finding[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  usePolling(async () => setData(await apiFetch("/api/ops/reconciliation")), 60_000);

  const runNow = async () => {
    setBusy(true);
    try {
      const r = await apiFetch<{ run: Run; findings: Finding[] }>("/api/ops/reconciliation/run", { method: "POST" });
      setData(r);
      setOpen(r.findings.length > 0);
      toast.success(HEADLINE[r.run.status] + ".");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const run = data?.run ?? null;
  const findings = data?.findings ?? [];
  return (
    <section className="mb-6 bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm" aria-label="Reconciliation">
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reconciliation</p>
          {run ? (
            <>
              <p className={`inline-block mt-1 px-3 py-1 rounded-full border text-xs font-black ${TONE[run.status]}`}>{HEADLINE[run.status]}</p>
              <p className="text-[11px] font-bold text-gray-400 mt-1">
                Checked {new Date(run.finishedAt ?? run.startedAt).toLocaleString()} · {run.ledgerRows} ledger entries ·{" "}
                {run.triggeredBy === "SCHEDULED" ? "daily check" : "run by an operator"}
              </p>
            </>
          ) : (
            <p className="text-sm font-bold text-gray-500 mt-1">{data ? "Not run yet. It runs daily at 04:30." : "Loading…"}</p>
          )}
        </div>
        <button disabled={busy} onClick={runNow} className="px-4 py-2 rounded-xl bg-black text-[#FFD217] font-black text-[11px] uppercase disabled:opacity-50">
          {busy ? "Checking…" : "Check now"}
        </button>
      </div>

      {run && run.status !== "FAILED" && (
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 text-xs">
          {[
            ["Topped up", run.topups],
            ["In wallets", run.walletBalances],
            ["Owed to drivers", run.driverBalances],
            ["Fares in progress", run.inFlight],
            ["Paid out / pending", run.paidOut],
            ...(Number(run.openingBalances) !== 0 ? [["Opening balances", run.openingBalances] as [string, number]] : []),
          ].map(([label, value]) => (
            <div key={label as string} className="bg-gray-50 rounded-xl p-2">
              <dt className="font-bold text-gray-400">{label}</dt>
              <dd className="font-black">{R(value as number)}</dd>
            </div>
          ))}
        </dl>
      )}
      {run?.error && <p className="text-xs font-bold text-red-700 mt-3">{run.error}</p>}

      {findings.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setOpen(!open)} className="text-xs font-black uppercase underline text-gray-600">
            {open ? "Hide" : "Show"} {run?.criticalCount ?? 0} problem(s), {run?.warningCount ?? 0} note(s)
          </button>
          {open && (
            <ul className="mt-2 space-y-2">
              {findings.map((f) => (
                <li key={f.id} className={`p-3 rounded-xl text-xs ${f.severity === "CRITICAL" ? "bg-red-50" : "bg-yellow-50"}`}>
                  <p className="font-black uppercase tracking-widest text-[10px]">
                    {f.severity} · {f.code.replaceAll("_", " ")}
                  </p>
                  <p className="font-bold mt-1">{f.detail}</p>
                  <p className="text-gray-500 font-bold mt-1">
                    {[
                      f.ownerRole && f.ownerId ? `${f.ownerRole.toLowerCase()} #${f.ownerId}` : null,
                      f.bookingId ? `trip #${f.bookingId}` : null,
                      f.payoutId ? `payout #${f.payoutId}` : null,
                      f.ledgerId ? `ledger entry #${f.ledgerId}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
