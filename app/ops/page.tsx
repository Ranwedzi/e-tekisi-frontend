"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useConfirm, useToast } from "../components/Feedback";
import { AlertIcon, LogoutIcon } from "../components/Icons";
import { apiFetch, errorMessage, openProtectedFile } from "../lib/api";
import { clearSession } from "../lib/session";
import { usePolling } from "../lib/usePolling";
import type { DocumentSummary, DriverApproval, DriverReview, DriverDocument, Insight, PayoutOps, PayoutStatus } from "../lib/types";

const FILTERS: (PayoutStatus | "ALL")[] = ["PENDING", "APPROVED", "PAID", "REJECTED", "ALL"];
const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Bank transfer",
  FNB_EWALLET: "FNB eWallet",
  CAPITEC_CASH_SEND: "Capitec Cash Send",
};

export default function OpsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"drivers" | "payouts" | "alerts">("drivers");

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans pb-16">
      <header className="p-6 bg-black text-white flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#FFD217]">e-Tekisi</p>
          <h1 className="text-xl font-black">Operations</h1>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-xs font-black uppercase text-gray-300">
          <LogoutIcon className="w-5 h-5" /> Logout
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-4">
        <div className="flex bg-white p-1 rounded-2xl mb-6 border border-gray-200 w-fit" role="tablist">
          {(["drivers", "payouts", "alerts"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 rounded-xl font-black text-xs uppercase ${tab === t ? "bg-black text-[#FFD217]" : "text-gray-400"}`}
            >
              {t === "drivers" ? "Drivers" : t === "payouts" ? "Payouts" : "Safety alerts"}
            </button>
          ))}
        </div>
        {tab === "drivers" ? <Drivers /> : tab === "payouts" ? <Payouts /> : <Alerts />}
      </div>
    </div>
  );
}

function Payouts() {
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<PayoutStatus | "ALL">("PENDING");
  const [list, setList] = useState<PayoutOps[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () =>
    setList(await apiFetch<PayoutOps[]>("/api/payouts", { query: { status: filter === "ALL" ? undefined : filter } }));

  const act = async (p: PayoutOps, path: string, body: unknown, success: string) => {
    setBusyId(p.id);
    try {
      await apiFetch(`/api/payouts/${p.id}/${path}`, { method: "PUT", body });
      toast.success(success);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const approve = async (p: PayoutOps) => {
    if (await confirm({ title: `Approve R${p.amount.toFixed(2)} to ${p.driverName ?? "driver"}?`, confirmLabel: "Approve" })) {
      await act(p, "approve", undefined, "Approved.");
    }
  };

  return (
    <section>
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setList(null);
            }}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase ${filter === f ? "bg-[#FFD217] text-black" : "bg-white text-gray-400 border border-gray-200"}`}
          >
            {f}
          </button>
        ))}
      </div>
      {/* Re-key the poller when the filter changes so it loads straight away. */}
      <PayoutList
        key={filter}
        list={list}
        busyId={busyId}
        onLoad={load}
        onApprove={approve}
        onPaid={(p, reference) => act(p, "paid", { reference }, "Marked as paid.")}
        onReject={(p, reason) => act(p, "reject", { reason }, "Rejected and refunded to the driver.")}
      />
    </section>
  );
}

function PayoutList({
  list,
  busyId,
  onLoad,
  onApprove,
  onPaid,
  onReject,
}: {
  list: PayoutOps[] | null;
  busyId: number | null;
  onLoad: () => Promise<void>;
  onApprove: (p: PayoutOps) => void;
  onPaid: (p: PayoutOps, reference: string) => void;
  onReject: (p: PayoutOps, reason: string) => void;
}) {
  usePolling(onLoad, 20_000);
  if (list === null) return <p className="text-center py-10 text-gray-400 font-bold">Loading...</p>;
  if (list.length === 0) return <p className="text-center py-10 text-gray-400 font-bold">Nothing here.</p>;
  return (
    <div className="space-y-3">
      {list.map((p) => (
        <PayoutCard key={p.id} p={p} busy={busyId === p.id} onApprove={onApprove} onPaid={onPaid} onReject={onReject} />
      ))}
    </div>
  );
}

function PayoutCard({
  p,
  busy,
  onApprove,
  onPaid,
  onReject,
}: {
  p: PayoutOps;
  busy: boolean;
  onApprove: (p: PayoutOps) => void;
  onPaid: (p: PayoutOps, reference: string) => void;
  onReject: (p: PayoutOps, reason: string) => void;
}) {
  const [mode, setMode] = useState<"none" | "paid" | "reject">("none");
  const [text, setText] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (mode === "paid") onPaid(p, text.trim());
    if (mode === "reject") onReject(p, text.trim());
  };

  return (
    <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm">
      <div className="flex justify-between items-start gap-4">
        <div>
          <p className="font-black">{p.driverName ?? `Driver #${p.driverId}`}</p>
          <p className="text-xs font-bold text-gray-400">{p.driverPhone}</p>
        </div>
        <div className="text-right">
          <p className="font-black text-xl">R{p.amount.toFixed(2)}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{p.status}</p>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm mt-3">
        <dt className="font-bold text-gray-400">Method</dt>
        <dd className="font-bold">{METHOD_LABEL[p.method] ?? p.method}</dd>
        {p.method === "BANK_TRANSFER" ? (
          <>
            <dt className="font-bold text-gray-400">Bank</dt>
            <dd className="font-bold">{p.bankName}</dd>
            <dt className="font-bold text-gray-400">Account</dt>
            <dd className="font-mono font-bold">{p.accountNumber}</dd>
            <dt className="font-bold text-gray-400">Holder</dt>
            <dd className="font-bold">{p.accountHolder}</dd>
          </>
        ) : (
          <>
            <dt className="font-bold text-gray-400">Send to</dt>
            <dd className="font-mono font-bold">{p.phoneNumber}</dd>
          </>
        )}
        <dt className="font-bold text-gray-400">Requested</dt>
        <dd className="font-bold">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ""}</dd>
        {p.reference && (
          <>
            <dt className="font-bold text-gray-400">Reference</dt>
            <dd className="font-bold">{p.reference}</dd>
          </>
        )}
        {p.rejectionReason && (
          <>
            <dt className="font-bold text-gray-400">Reason</dt>
            <dd className="font-bold">{p.rejectionReason}</dd>
          </>
        )}
      </dl>

      {(p.status === "PENDING" || p.status === "APPROVED") && mode === "none" && (
        <div className="flex gap-2 mt-4">
          {p.status === "PENDING" && (
            <button disabled={busy} onClick={() => onApprove(p)} className="px-4 py-3 rounded-xl bg-black text-[#FFD217] font-black text-xs uppercase disabled:opacity-60">
              Approve
            </button>
          )}
          {p.status === "APPROVED" && (
            <button disabled={busy} onClick={() => setMode("paid")} className="px-4 py-3 rounded-xl bg-black text-[#FFD217] font-black text-xs uppercase disabled:opacity-60">
              Mark paid
            </button>
          )}
          <button disabled={busy} onClick={() => setMode("reject")} className="px-4 py-3 rounded-xl bg-red-50 text-red-600 font-black text-xs uppercase disabled:opacity-60">
            Reject
          </button>
        </div>
      )}

      {mode !== "none" && (
        <form onSubmit={submit} className="flex gap-2 mt-4">
          <input
            autoFocus
            value={text}
            maxLength={mode === "paid" ? 100 : 300}
            onChange={(e) => setText(e.target.value)}
            aria-label={mode === "paid" ? "Payment reference" : "Reason for rejecting"}
            placeholder={mode === "paid" ? "Bank / provider reference" : "Reason (the driver sees this)"}
            className="flex-1 p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200"
          />
          <button type="submit" disabled={busy || !text.trim()} className={`px-4 rounded-xl font-black text-xs uppercase disabled:opacity-60 ${mode === "reject" ? "bg-red-600 text-white" : "bg-black text-[#FFD217]"}`}>
            {mode === "paid" ? "Save" : "Reject"}
          </button>
          <button type="button" onClick={() => setMode("none")} className="px-3 rounded-xl bg-gray-100 font-black text-xs uppercase">
            Back
          </button>
        </form>
      )}
    </div>
  );
}

const DRIVER_FILTERS: DriverApproval[] = ["PENDING_APPROVAL", "APPROVED", "REJECTED"];

/** Driver vetting: compare the details with the driver's documents, then approve or reject. */
function Drivers() {
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<DriverApproval>("PENDING_APPROVAL");
  const [list, setList] = useState<DriverReview[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => setList(await apiFetch<DriverReview[]>("/api/ops/drivers", { query: { status: filter } }));

  const act = async (d: DriverReview, path: "approve" | "reject", body?: unknown) => {
    setBusyId(d.id);
    try {
      await apiFetch(`/api/ops/drivers/${d.id}/${path}`, { method: "PUT", body });
      toast.success(path === "approve" ? `${d.fullName} approved.` : `${d.fullName} rejected and taken offline.`);
      setRejecting(null);
      setReason("");
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const approve = async (d: DriverReview) => {
    const ok = await confirm({
      title: `Approve ${d.fullName}?`,
      message: "Their required documents must be accepted first. Approve only if the details match the documents.",
      confirmLabel: "Approve",
    });
    if (ok) await act(d, "approve");
  };

  return (
    <section>
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {DRIVER_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setList(null);
            }}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase ${filter === f ? "bg-[#FFD217] text-black" : "bg-white text-gray-400 border border-gray-200"}`}
          >
            {f === "PENDING_APPROVAL" ? "Waiting" : f}
          </button>
        ))}
      </div>
      <Poller key={filter} fn={load} />
      {list === null ? (
        <p className="text-center py-10 text-gray-400 font-bold">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-center py-10 text-gray-400 font-bold">Nothing here.</p>
      ) : (
        <div className="space-y-3">
          {list.map((d) => (
            <div key={d.id} className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="font-black">{d.fullName}</p>
                  <p className="text-xs font-bold text-gray-400">
                    {d.email} · {d.phoneNumber}
                  </p>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{d.approvalStatus.replace("_", " ")}</p>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm mt-3">
                <dt className="font-bold text-gray-400">Taxi plate</dt>
                <dd className="font-mono font-bold">{d.taxiPlate}</dd>
                <dt className="font-bold text-gray-400">Licence no.</dt>
                <dd className="font-mono font-bold">{d.licenseNumber}</dd>
                <dt className="font-bold text-gray-400">Signed up</dt>
                <dd className="font-bold">{d.registeredAt ? new Date(d.registeredAt).toLocaleString() : ""}</dd>
                <dt className="font-bold text-gray-400">Trips</dt>
                <dd className="font-bold">{d.tripsCompleted}</dd>
                {d.approvalNote && (
                  <>
                    <dt className="font-bold text-gray-400">Reason</dt>
                    <dd className="font-bold">{d.approvalNote}</dd>
                  </>
                )}
              </dl>
              <Documents driverId={d.id} />
              {rejecting === d.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (reason.trim()) void act(d, "reject", { reason: reason.trim() });
                  }}
                  className="flex gap-2 mt-4"
                >
                  <input
                    autoFocus
                    value={reason}
                    maxLength={300}
                    onChange={(e) => setReason(e.target.value)}
                    aria-label="Reason for rejecting"
                    placeholder="Reason (the driver sees this)"
                    className="flex-1 p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200"
                  />
                  <button type="submit" disabled={busyId === d.id || !reason.trim()} className="px-4 rounded-xl bg-red-600 text-white font-black text-xs uppercase disabled:opacity-60">
                    Reject
                  </button>
                  <button type="button" onClick={() => setRejecting(null)} className="px-3 rounded-xl bg-gray-100 font-black text-xs uppercase">
                    Back
                  </button>
                </form>
              ) : (
                <div className="flex gap-2 mt-4">
                  {d.approvalStatus !== "APPROVED" && (
                    <button disabled={busyId === d.id} onClick={() => approve(d)} className="px-4 py-3 rounded-xl bg-black text-[#FFD217] font-black text-xs uppercase disabled:opacity-60">
                      Approve
                    </button>
                  )}
                  <button
                    disabled={busyId === d.id}
                    onClick={() => {
                      setRejecting(d.id);
                      setReason("");
                    }}
                    className="px-4 py-3 rounded-xl bg-red-50 text-red-600 font-black text-xs uppercase disabled:opacity-60"
                  >
                    {d.approvalStatus === "APPROVED" ? "Suspend" : "Reject"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** The driver's uploaded documents: open each, then accept (checking the expiry date) or reject with a reason. */
function Documents({ driverId }: { driverId: number }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DocumentSummary | null>(null);
  const [expiry, setExpiry] = useState<Record<number, string>>({});
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => setData(await apiFetch<DocumentSummary>(`/api/ops/drivers/${driverId}/documents`));

  const act = async (doc: DriverDocument, action: "accept" | "reject") => {
    setBusy(true);
    try {
      const body = action === "accept" ? { expiresOn: expiry[doc.id] || doc.expiresOn || null } : { reason: reason.trim() };
      await apiFetch(`/api/ops/documents/${doc.id}/${action}`, { method: "PUT", body });
      toast.success(action === "accept" ? `${doc.label} accepted.` : `${doc.label} rejected; the driver was told why.`);
      setRejecting(null);
      setReason("");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          void load().catch((e) => toast.error(errorMessage(e)));
        }}
        className="mt-3 text-xs font-black uppercase underline text-gray-500"
      >
        Documents
      </button>
    );
  }
  if (!data) return <p className="mt-3 text-xs font-bold text-gray-400">Loading documents…</p>;
  const shown = data.items.filter((x) => x.status !== "SUPERSEDED");
  return (
    <div className="mt-4 border-t border-gray-100 pt-3 space-y-2" aria-label="Documents">
      <p className={`text-xs font-black ${data.missing.length ? "text-red-600" : "text-green-700"}`}>
        {data.missing.length ? `Still needed: ${data.missing.join(", ").replaceAll("_", " ").toLowerCase()}` : "All required documents accepted."}
      </p>
      {shown.length === 0 && <p className="text-xs font-bold text-gray-400">Nothing uploaded yet.</p>}
      {shown.map((doc) => (
        <div key={doc.id} className="bg-gray-50 rounded-xl p-3 text-sm">
          <div className="flex justify-between gap-2">
            <p className="font-black">{doc.label}</p>
            <p className="text-[10px] font-black uppercase text-gray-500">{doc.status}</p>
          </div>
          <p className="text-xs font-bold text-gray-500">
            {doc.fileName} · {(doc.sizeBytes / 1024).toFixed(0)} KB · uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
            {doc.expiresOn ? ` · expires ${doc.expiresOn}` : ""}
          </p>
          {doc.reviewNote && <p className="text-xs font-bold text-red-600">Reason: {doc.reviewNote}</p>}
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <button
              onClick={() => openProtectedFile(`/api/ops/documents/${doc.id}/file`).catch((e) => toast.error(errorMessage(e)))}
              className="px-3 py-2 rounded-lg bg-white border border-gray-200 font-black text-[11px] uppercase"
            >
              View
            </button>
            {doc.status === "SUBMITTED" && rejecting !== doc.id && (
              <>
                <label className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                  Expires
                  <input
                    type="date"
                    aria-label={`Expiry date of ${doc.label}`}
                    value={expiry[doc.id] ?? doc.expiresOn ?? ""}
                    onChange={(e) => setExpiry({ ...expiry, [doc.id]: e.target.value })}
                    className="p-1 rounded border border-gray-200"
                  />
                </label>
                <button disabled={busy} onClick={() => act(doc, "accept")} className="px-3 py-2 rounded-lg bg-black text-[#FFD217] font-black text-[11px] uppercase disabled:opacity-50">
                  Accept
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    setRejecting(doc.id);
                    setReason("");
                  }}
                  className="px-3 py-2 rounded-lg bg-red-50 text-red-600 font-black text-[11px] uppercase disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
          </div>
          {rejecting === doc.id && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (reason.trim()) void act(doc, "reject");
              }}
              className="flex gap-2 mt-2"
            >
              <input
                autoFocus
                value={reason}
                maxLength={300}
                onChange={(e) => setReason(e.target.value)}
                aria-label={`Reason for rejecting ${doc.label}`}
                placeholder="Reason (the driver sees this)"
                className="flex-1 min-w-0 p-2 rounded-lg border border-gray-200 text-sm font-bold"
              />
              <button type="submit" disabled={busy || !reason.trim()} className="px-3 rounded-lg bg-red-600 text-white font-black text-[11px] uppercase disabled:opacity-50">
                Reject
              </button>
              <button type="button" onClick={() => setRejecting(null)} className="px-3 rounded-lg bg-gray-100 font-black text-[11px] uppercase">
                Back
              </button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}

/** Polls `fn`; re-keyed by the parent when its filter changes so the new list loads straight away. */
function Poller({ fn }: { fn: () => Promise<void> }) {
  usePolling(fn, 20_000);
  return null;
}

/** CRITICAL safety alerts. Acknowledging one tells the team (and monitoring) someone is handling it. */
function Alerts() {
  const toast = useToast();
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState<Insight[] | null>(null);
  const [acking, setAcking] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await apiFetch<{ items: Insight[] }>("/api/insights", {
      query: { severity: "CRITICAL", size: 30, acknowledged: open ? false : undefined },
    });
    setItems(res.items);
  };

  const acknowledge = async (e: FormEvent, i: Insight) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch(`/api/insights/${i.id}/ack`, { method: "PUT", body: { note: note.trim() || null } });
      toast.success("Alert acknowledged.");
      setAcking(null);
      setNote("");
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="flex gap-2 mb-4">
        {[true, false].map((o) => (
          <button
            key={String(o)}
            onClick={() => {
              setOpen(o);
              setItems(null);
            }}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase ${open === o ? "bg-[#FFD217] text-black" : "bg-white text-gray-400 border border-gray-200"}`}
          >
            {o ? "Needs action" : "All"}
          </button>
        ))}
      </div>
      <Poller key={String(open)} fn={load} />
      {items === null ? (
        <p className="text-center py-10 text-gray-400 font-bold">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-center py-10 text-gray-400 font-bold">
          {open ? "No alerts waiting for someone to pick them up." : "No critical alerts."}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <div
              key={i.id}
              className={`bg-white p-5 rounded-[24px] border-l-8 shadow-sm flex gap-4 ${i.acknowledgedAt ? "border-gray-300" : "border-red-600"}`}
            >
              <div className={`shrink-0 ${i.acknowledgedAt ? "text-gray-400" : "text-red-600"}`}>
                <AlertIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-widest ${i.acknowledgedAt ? "text-gray-400" : "text-red-600"}`}>
                  {i.code.replaceAll("_", " ")}
                </p>
                <p className="font-bold text-sm">{i.message}</p>
                <p className="text-[11px] font-bold text-gray-400 mt-1">
                  {i.bookingId ? `Booking #${i.bookingId} · ` : ""}
                  {i.createdAt ? new Date(i.createdAt).toLocaleString() : ""}
                </p>
                {i.acknowledgedAt ? (
                  <p className="text-[11px] font-bold text-green-700 mt-2">
                    Acknowledged by operator #{i.acknowledgedBy} · {new Date(i.acknowledgedAt).toLocaleString()}
                    {i.acknowledgedNote ? ` · ${i.acknowledgedNote}` : ""}
                  </p>
                ) : acking === i.id ? (
                  <form onSubmit={(e) => acknowledge(e, i)} className="flex gap-2 mt-3">
                    <input
                      autoFocus
                      value={note}
                      maxLength={300}
                      onChange={(e) => setNote(e.target.value)}
                      aria-label="What you're doing about it"
                      placeholder="What you're doing (optional)"
                      className="flex-1 min-w-0 p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200"
                    />
                    <button type="submit" disabled={busy} className="px-4 rounded-xl bg-black text-[#FFD217] font-black text-xs uppercase disabled:opacity-60">
                      Acknowledge
                    </button>
                    <button type="button" onClick={() => setAcking(null)} className="px-3 rounded-xl bg-gray-100 font-black text-xs uppercase">
                      Back
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      setAcking(i.id);
                      setNote("");
                    }}
                    className="mt-3 px-4 py-3 rounded-xl bg-red-600 text-white font-black text-xs uppercase"
                  >
                    I&apos;m handling this
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
