"use client";
import { useEffect, useState } from "react";
import { useT } from "../lib/i18n";

/** "1:42 left" until `until` (ISO-8601), refreshed every second. Shows `expiredLabel` once it passes. */
export function Countdown({ until, expiredLabel }: { until: string | null; expiredLabel?: string }) {
  const [now, setNow] = useState<number | null>(null);
  const t = useT();

  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  if (!until || now === null) return null;
  const left = Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
  if (left === 0) return <span>{expiredLabel ?? t("countdown.expired")}</span>;
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, "0");
  return (
    <span aria-live="off">
      {t("countdown.left", { time: `${m}:${s}` })}
    </span>
  );
}
