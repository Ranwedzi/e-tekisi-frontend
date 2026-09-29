"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

// Toasts and confirm dialogs, replacing window.alert / window.confirm.

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface FeedbackApi {
  toast: (kind: ToastKind, message: string) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<{ opts: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);
  const nextId = useRef(1);

  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, kind, message }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), kind === "error" ? 6000 : 4000);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ opts, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const api = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}

      <div className="fixed top-4 left-4 right-4 z-[5000] flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto max-w-sm w-full px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm animate-in fade-in slide-in-from-bottom-2 ${
              t.kind === "error" ? "bg-red-600 text-white" : t.kind === "success" ? "bg-black text-[#FFD217]" : "bg-white text-black border border-gray-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {pending && (
        <div className="fixed inset-0 bg-black/70 z-[4000] flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="w-full max-w-sm bg-white rounded-[32px] p-6 shadow-2xl text-black animate-in fade-in slide-in-from-bottom-4">
            <h2 id="confirm-title" className="text-xl font-black mb-2">{pending.opts.title}</h2>
            {pending.opts.message && <p className="text-sm font-bold text-gray-500 mb-6">{pending.opts.message}</p>}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => close(false)} className="py-4 rounded-2xl bg-gray-100 font-black text-xs uppercase tracking-widest">
                {pending.opts.cancelLabel ?? "Back"}
              </button>
              <button
                onClick={() => close(true)}
                autoFocus
                className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest ${pending.opts.danger ? "bg-red-600 text-white" : "bg-black text-[#FFD217]"}`}
              >
                {pending.opts.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("FeedbackProvider is missing");
  return ctx;
}

export function useToast() {
  const { toast } = useFeedback();
  return useMemo(
    () => ({
      success: (m: string) => toast("success", m),
      error: (m: string) => toast("error", m),
      info: (m: string) => toast("info", m),
    }),
    [toast],
  );
}

export function useConfirm() {
  return useFeedback().confirm;
}
