"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "./api";

export interface LegalInfo {
  /** The terms/privacy version people accept; sent back at sign-up. */
  version: string;
  phoneVerificationAvailable: boolean;
}

let cached: Promise<LegalInfo> | null = null;

/** GET /api/legal, fetched once per page load. Null until it arrives (or if it fails). */
export function useLegal(): LegalInfo | null {
  const [info, setInfo] = useState<LegalInfo | null>(null);
  useEffect(() => {
    let live = true;
    cached ??= apiFetch<LegalInfo>("/api/legal", { auth: false }).catch((e) => {
      cached = null; // try again next time
      throw e;
    });
    cached.then((i) => live && setInfo(i)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return info;
}
