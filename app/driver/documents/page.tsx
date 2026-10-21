"use client";
import { useState } from "react";
import Link from "next/link";
import { BackIcon } from "../../components/Icons";
import { Spinner } from "../../components/Spinner";
import { useToast } from "../../components/Feedback";
import { apiFetch, errorMessage, openProtectedFile } from "../../lib/api";
import { useLivePolling } from "../../lib/live";
import type { DocumentSummary, DocumentType, DriverDocument } from "../../lib/types";
import { useT } from "../../lib/i18n";

const HAS_EXPIRY: DocumentType[] = ["DRIVERS_LICENCE", "PRDP", "OPERATING_LICENCE", "ROADWORTHY"];
const OPTIONAL: DocumentType[] = ["ROADWORTHY", "VEHICLE_PHOTO"];

/** Upload the documents operators check before a driver can take trips. */
export default function DriverDocumentsPage() {
  const [data, setData] = useState<DocumentSummary | null>(null);
  const tr = useT();
  const load = async () => setData(await apiFetch<DocumentSummary>("/api/me/documents"));
  useLivePolling(load, ["documents"], 30_000, 60_000);

  if (!data) return <Spinner dark />;
  const types = [...data.required, ...OPTIONAL.filter((t) => !data.required.includes(t))];

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white font-sans p-6 pb-32">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/driver" className="p-3 bg-[#262626] rounded-2xl text-[#FFD217] active:scale-90 transition shadow-lg border border-[#333]" aria-label={tr("common.backLabel")}>
          <BackIcon />
        </Link>
        <h1 className="text-2xl font-black uppercase tracking-tighter">{tr("docs.title")}</h1>
      </div>
      <p className="text-sm font-bold text-gray-400 mb-6">
        {data.missing.length === 0
          ? tr("docs.allAccepted")
          : tr("docs.intro")}
      </p>
      <div className="space-y-4">
        {types.map((t) => (
          <DocumentRow
            key={t}
            type={t}
            required={data.required.includes(t)}
            current={data.items.find((d) => d.type === t && d.status !== "SUPERSEDED")}
            onChanged={load}
          />
        ))}
      </div>
    </div>
  );
}

function DocumentRow({
  type,
  required,
  current,
  onChanged,
}: {
  type: DocumentType;
  required: boolean;
  current?: DriverDocument;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [expiresOn, setExpiresOn] = useState("");
  const [busy, setBusy] = useState(false);
  const t = useT();
  const label = t(`doc.${type}`);
  const needsUpload = !current || current.status === "REJECTED" || current.status === "EXPIRED";

  const upload = async () => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("docs.tooBig"));
      return;
    }
    const form = new FormData();
    form.append("type", type);
    form.append("file", file);
    if (expiresOn) form.append("expiresOn", expiresOn);
    setBusy(true);
    try {
      await apiFetch("/api/me/documents", { method: "POST", body: form });
      toast.success(t("docs.uploaded", { document: label }));
      setFile(null);
      setExpiresOn("");
      await onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const tone =
    current?.status === "ACCEPTED"
      ? "text-green-400"
      : current?.status === "REJECTED" || current?.status === "EXPIRED"
        ? "text-red-400"
        : "text-[#FFD217]";

  return (
    <section className="bg-[#262626] border border-[#333] rounded-[24px] p-5" aria-label={label}>
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="font-black">{label}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{required ? t("docs.required") : t("docs.optional")}</p>
        </div>
        <p className={`text-xs font-black uppercase ${tone}`}>{current ? t(`docStatus.${current.status}`) : t("docs.notUploaded")}</p>
      </div>
      {current && (
        <div className="mt-3 text-xs font-bold text-gray-400 space-y-1">
          <p>
            {current.fileName}
            {current.expiresOn ? ` · ${t("docs.expires", { date: current.expiresOn })}` : ""}{" "}
            <button onClick={() => openProtectedFile(`/api/me/documents/${current.id}/file`).catch((e) => toast.error(errorMessage(e)))} className="underline text-gray-300">
              {t("docs.view")}
            </button>
          </p>
          {current.reviewNote && <p className="text-red-300">{t("docs.reason", { reason: current.reviewNote })}</p>}
        </div>
      )}
      {(needsUpload || current?.status === "SUBMITTED") && (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="sr-only">{t("docs.choose", { document: label })}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs font-bold text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#FFD217] file:text-black file:font-black"
            />
          </label>
          {HAS_EXPIRY.includes(type) && (
            <label className="flex items-center gap-3 text-xs font-bold text-gray-400">
              {t("docs.expiry")}
              <input
                type="date"
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
                className="p-2 rounded-xl bg-[#1A1A1A] border border-[#333] text-white"
              />
            </label>
          )}
          <button
            onClick={upload}
            disabled={!file || busy}
            className="w-full py-3 rounded-2xl bg-[#FFD217] text-black font-black text-xs uppercase disabled:opacity-40"
          >
            {busy ? t("docs.uploading") : current?.status === "SUBMITTED" ? t("docs.replace") : t("docs.upload")}
          </button>
        </div>
      )}
    </section>
  );
}
