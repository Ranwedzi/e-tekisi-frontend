import type { ReactNode } from "react";
import { TaxiIcon } from "./Icons";

/** The yellow full-screen card used by the account-recovery pages. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FFD217] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 bg-[#FFD217] rounded-full flex items-center justify-center mb-4 shadow-inner text-black">
          <TaxiIcon className="w-8 h-8" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-black text-[#1A1A1A] mb-1 text-center">{title}</h1>
        {subtitle && <p className="text-gray-400 text-[13px] font-bold mb-6 text-center">{subtitle}</p>}
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}

export const authInput = "w-full p-4 bg-[#1A1A1A] text-white rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400";
export const authButton =
  "w-full bg-[#1A1A1A] text-white font-black py-4 rounded-2xl mt-6 shadow-xl active:scale-95 transition-transform disabled:opacity-60";
