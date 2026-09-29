"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('etekisi_session') || '{}');
    fetch(`http://localhost:8080/api/bookings/user/${session.userId}`)
      .then(res => res.json())
      .then(data => setHistory(data));
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6 font-sans">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/profile" className="p-3 bg-white rounded-2xl shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        </Link>
        <h1 className="text-2xl font-black">Trip History</h1>
      </div>

      <div className="space-y-4">
        {history.length > 0 ? history.map((trip: any) => (
          <div key={trip.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-3 py-1 rounded-full uppercase">{trip.status}</span>
              <p className="text-[10px] font-bold text-gray-400">{trip.scheduledTime}</p>
            </div>
            <h3 className="font-black text-lg mb-4">{trip.pickupLocation} → {trip.destination}</h3>
            
            {/* Driver Details Card */}
            <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold">D</div>
                <div>
                  <p className="text-xs font-black">Driver Assigned</p>
                  <p className="text-[10px] text-gray-400 font-bold">Plate: GP 123 456</p>
                </div>
              </div>
              <a href="tel:0712345678" className="p-2 bg-green-500 rounded-full text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" /></svg>
              </a>
            </div>
          </div>
        )) : (
          <div className="text-center py-20">
            <p className="text-gray-400 font-bold">No trips found in your history.</p>
          </div>
        )}
      </div>
    </div>
  );
}