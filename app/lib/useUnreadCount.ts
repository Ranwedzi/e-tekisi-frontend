"use client";
import { useState } from "react";
import { apiFetch } from "./api";
import { usePolling } from "./usePolling";

/** Unread notification count for the signed-in user, refreshed every 15 s. */
export function useUnreadCount(): number {
  const [count, setCount] = useState(0);
  usePolling(async () => {
    const res = await apiFetch<{ count: number }>("/api/notifications/unread-count");
    setCount(res.count);
  }, 15_000);
  return count;
}
