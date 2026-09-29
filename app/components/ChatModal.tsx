"use client";
import { useState, useEffect, useRef } from 'react';

export default function ChatModal({ bookingId, senderId, onClose }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = () => {
    fetch(`http://localhost:8080/api/messages/${bookingId}`).then(res => res.json()).then(data => setMessages(data));
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    await fetch('http://localhost:8080/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, senderId, content: text }),
    });
    setText("");
    fetchMessages();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[3000] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] p-6 h-[75vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-black text-xl text-black uppercase tracking-tighter">Live Chat</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full active:scale-90 transition">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 mb-6 no-scrollbar px-2 flex flex-col">
          {messages.map((m: any) => {
            const isMe = m.senderId === senderId;
            return (
              <div key={m.id} className={`max-w-[85%] p-4 rounded-[22px] font-bold text-sm shadow-sm ${isMe ? 'bg-[#FFD217] text-black self-end rounded-tr-none' : 'bg-black text-[#FFD217] self-start rounded-tl-none'}`}>
                {m.content}
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
        <div className="flex gap-2 bg-gray-50 p-2 rounded-3xl border border-gray-100">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} className="flex-1 p-4 bg-transparent outline-none font-bold text-black" placeholder="Type a message..." />
          <button onClick={send} className="bg-black text-[#FFD217] px-6 rounded-2xl font-black text-xs uppercase active:scale-95 transition">Send</button>
        </div>
      </div>
    </div>
  );
}