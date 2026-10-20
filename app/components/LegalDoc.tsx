import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Layout for the terms, privacy policy and driver agreement.
 *
 * DRAFTS: written to describe what the app actually does, but not reviewed by
 * a lawyer. Fill in every [bracketed] item and have them reviewed before any
 * real user signs up, then bump LEGAL_VERSION on the backend.
 */
export const LEGAL_DRAFT = true;

export function LegalDoc({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/" className="text-xs font-black uppercase tracking-widest text-gray-400">
          e-Tekisi
        </Link>
        <h1 className="text-3xl font-black mt-2">{title}</h1>
        <p className="text-sm font-bold text-gray-400 mt-1">Last updated {updated}</p>
        {LEGAL_DRAFT && (
          <p className="mt-6 p-4 rounded-2xl bg-yellow-50 border border-yellow-300 text-sm font-bold text-yellow-900" role="note">
            Draft for the pilot. This document has not yet been reviewed by a lawyer, and the items in [brackets] still
            have to be completed.
          </p>
        )}
        <div className="legal mt-8 space-y-4 text-[15px] leading-relaxed text-gray-800 [&_h2]:text-xl [&_h2]:font-black [&_h2]:mt-8 [&_h2]:text-black [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_th]:text-left [&_th]:bg-gray-50">
          {children}
        </div>
      </div>
    </main>
  );
}

export const COMPANY = "[Company legal name] (Pty) Ltd, registration number [number]";
export const CONTACT = "[Information Officer name], Information Officer, [privacy@your-domain], [postal address]";
