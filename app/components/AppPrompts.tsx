"use client";
import { useEffect, useState } from "react";
import { enablePush, pushState, type PushState } from "../lib/push";

// Two dismissible cards on the home screens: turn on notifications, and
// install the app. Each shows only when it applies and hasn't been dismissed.

const DISMISSED_PUSH = "etekisi_push_prompt_dismissed";
const DISMISSED_INSTALL = "etekisi_install_prompt_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function dismissed(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function dismiss(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // ignore
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function AppPrompts({ dark = false, role }: { dark?: boolean; role: "COMMUTER" | "DRIVER" }) {
  const [push, setPush] = useState<PushState | null>(null);
  const [pushHidden, setPushHidden] = useState(true);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosInstall, setIosInstall] = useState(false);
  const [installHidden, setInstallHidden] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    pushState()
      .catch((): PushState => "unsupported")
      .then((s) => {
        if (!alive) return;
        setPush(s);
        setPushHidden(dismissed(DISMISSED_PUSH));
        setInstallHidden(dismissed(DISMISSED_INSTALL) || isStandalone());
        setIosInstall(isIos() && !isStandalone());
      });
    const onPrompt = (e: Event) => {
      e.preventDefault(); // show our own card instead of the browser's mini-bar
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      alive = false;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const card = dark ? "bg-[#262626] border-[#333] text-white" : "bg-white border-gray-100 text-[#1A1A1A]";
  const muted = dark ? "text-gray-400" : "text-gray-500";
  const why =
    role === "DRIVER"
      ? "Hear about trip requests near you and accepted offers, even with the app closed."
      : "Know the moment a driver offers you a ride or arrives, even with the app closed.";

  const showPush = !pushHidden && push === "off";
  const showInstall = !installHidden && (installEvent !== null || iosInstall);
  if (!showPush && !showInstall) return null;

  return (
    <div className="px-6 pt-4 space-y-3">
      {showPush && (
        <div className={`p-5 rounded-[24px] border shadow-sm ${card}`} role="region" aria-label="Notifications">
          <p className="font-black text-sm">Turn on notifications</p>
          <p className={`text-xs mt-1 ${muted}`}>{why}</p>
          <div className="flex gap-2 mt-4">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setPush(await enablePush());
                } catch {
                  setPush("off");
                } finally {
                  setBusy(false);
                }
              }}
              className="flex-1 bg-[#FFD217] text-black py-3 rounded-2xl font-black text-xs uppercase disabled:opacity-50"
            >
              {busy ? "Turning on..." : "Turn on"}
            </button>
            <button
              onClick={() => {
                dismiss(DISMISSED_PUSH);
                setPushHidden(true);
              }}
              className={`px-4 py-3 rounded-2xl font-black text-xs uppercase ${muted}`}
            >
              Not now
            </button>
          </div>
        </div>
      )}
      {showInstall && (
        <div className={`p-5 rounded-[24px] border shadow-sm ${card}`} role="region" aria-label="Install the app">
          <p className="font-black text-sm">Add e-Tekisi to your home screen</p>
          <p className={`text-xs mt-1 ${muted}`}>
            {installEvent
              ? "Opens like an app, full screen, and works with notifications."
              : "In Safari, tap the Share button, then “Add to Home Screen”. On iPhone, notifications work once it's added."}
          </p>
          <div className="flex gap-2 mt-4">
            {installEvent && (
              <button
                onClick={async () => {
                  await installEvent.prompt();
                  const choice = await installEvent.userChoice;
                  setInstallEvent(null);
                  if (choice.outcome === "accepted") setInstallHidden(true);
                }}
                className="flex-1 bg-black text-white py-3 rounded-2xl font-black text-xs uppercase"
              >
                Install
              </button>
            )}
            <button
              onClick={() => {
                dismiss(DISMISSED_INSTALL);
                setInstallHidden(true);
              }}
              className={`px-4 py-3 rounded-2xl font-black text-xs uppercase ${muted} ${installEvent ? "" : "flex-1 text-left px-0"}`}
            >
              {installEvent ? "Not now" : "Got it"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
