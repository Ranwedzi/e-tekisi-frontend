"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function BookLater() {
  const [formData, setFormData] = useState({
    commuterId: 1, // Defaulting to user 1 for now
    pickupLocation: '',
    destination: '',
    scheduledTime: ''
  });
  const [loading, setLoading] = useState(false);

  const handleBooking = async () => {
    if (!formData.pickupLocation || !formData.destination || !formData.scheduledTime) {
        return alert("Please fill in all fields");
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const message = await response.text();
      alert(message);
      window.location.href = "/"; // Go back home
    } catch (error) {
      alert("Error saving booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <Link href="/" className="p-3 bg-gray-50 rounded-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-xl font-black">Schedule Trip</h1>
        <div className="w-12"></div>
      </div>

      {/* Hero Icon */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        </div>
        <p className="text-gray-400 font-bold text-center px-6">Book your taxi in advance.</p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Pick-up Location</label>
            <input 
                className="w-full p-5 bg-gray-50 rounded-[24px] border border-gray-100 outline-none font-bold" 
                placeholder="e.g. Bree Taxi Rank"
                onChange={(e) => setFormData({...formData, pickupLocation: e.target.value})}
            />
        </div>

        <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Destination</label>
            <input 
                className="w-full p-5 bg-gray-50 rounded-[24px] border border-gray-100 outline-none font-bold" 
                placeholder="e.g. Sandton City"
                onChange={(e) => setFormData({...formData, destination: e.target.value})}
            />
        </div>

        <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Departure Time</label>
            <input 
                type="datetime-local"
                className="w-full p-5 bg-gray-50 rounded-[24px] border border-gray-100 outline-none font-bold text-gray-400" 
                onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
            />
        </div>

        <button 
            onClick={handleBooking}
            disabled={loading}
            className="w-full bg-black text-white font-black py-6 rounded-[24px] shadow-xl mt-10 active:scale-95 transition-transform"
        >
          {loading ? "SAVING..." : "CONFIRM BOOKING"}
        </button>
      </div>
    </div>
  );
}