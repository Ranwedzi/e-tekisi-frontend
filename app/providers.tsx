"use client";
import type { ReactNode } from "react";
import { FeedbackProvider } from "./components/Feedback";
import { SessionWatcher } from "./components/SessionWatcher";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FeedbackProvider>
      <SessionWatcher />
      {children}
    </FeedbackProvider>
  );
}
