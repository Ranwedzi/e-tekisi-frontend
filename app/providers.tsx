"use client";
import { useEffect, type ReactNode } from "react";
import { FeedbackProvider } from "./components/Feedback";
import { SessionWatcher } from "./components/SessionWatcher";
import { registerServiceWorker, syncPush } from "./lib/push";
import { HtmlLang } from "./lib/i18n";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
    void syncPush();
  }, []);
  return (
    <FeedbackProvider>
      <SessionWatcher />
      <HtmlLang />
      {children}
    </FeedbackProvider>
  );
}
