"use client";
import { useT } from "../lib/i18n";

export function Spinner({ dark = false, label }: { dark?: boolean; label?: string }) {
  const t = useT();
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${dark ? "bg-[#1A1A1A]" : "bg-white"}`}>
      <div className="w-10 h-10 border-4 border-[#FFD217] border-t-transparent rounded-full animate-spin" role="status" aria-label={label ?? t("common.loading")} />
      {label && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>}
    </div>
  );
}
