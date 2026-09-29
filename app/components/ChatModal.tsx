"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch, errorMessage } from "../lib/api";
import { usePolling } from "../lib/usePolling";
import type { ChatMessage } from "../lib/types";
import { useAuthedSession } from "./RequireAuth";
import { useToast } from "./Feedback";
import { CloseIcon } from "./Icons";

/** Trip chat between the booking's commuter and driver. */
export default function ChatModal({ bookingId, title = "Live Chat", onClose }: { bookingId: number; title?: string; onClose: () => void }) {
  const session = useAuthedSession();
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    setMessages(await apiFetch<ChatMessage[]>(`/api/messages/${bookingId}`));
  };
  usePolling(fetchMessages, 3000);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      await apiFetch("/api/messages/send", { method: "POST", body: { bookingId, content } });
      setText("");
      await fetchMessages();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  // Commuter and driver ids come from different tables, so compare the role too.
  const isMine = (m: ChatMessage) => m.senderId === session.userId && m.senderRole === session.role;

  return (
    <div className="fixed inset-0 bg-black/80 z-[3000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md bg-white rounded-[40px] p-6 h-[75vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-black text-xl text-black uppercase tracking-tighter">{title}</h2>
          <button onClick={onClose} aria-label="Close chat" className="p-2 bg-gray-100 rounded-full active:scale-90 transition text-black">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 mb-6 no-scrollbar px-2 flex flex-col">
          {messages.length === 0 && <p className="text-center text-sm font-bold text-gray-400 mt-10">No messages yet. Say hello!</p>}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] p-4 rounded-[22px] font-bold text-sm shadow-sm ${isMine(m) ? "bg-[#FFD217] text-black self-end rounded-tr-none" : "bg-black text-[#FFD217] self-start rounded-tl-none"}`}
            >
              {m.content}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 bg-gray-50 p-2 rounded-3xl border border-gray-100">
          <input
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            aria-label="Message"
            className="flex-1 p-4 bg-transparent outline-none font-bold text-black"
            placeholder="Type a message..."
          />
          <button type="submit" disabled={sending || !text.trim()} className="bg-black text-[#FFD217] px-6 rounded-2xl font-black text-xs uppercase active:scale-95 transition disabled:opacity-50">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
