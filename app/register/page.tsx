"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function Register() {
  const [role, setRole] = useState('COMMUTER');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', phoneNumber: '', email: '', password: '', confirmPassword: '', taxiPlate: ''
  });

  const handleRegister = async () => {
    if (formData.password !== formData.confirmPassword) return alert("Passwords do not match!");
    if (!formData.email || !formData.password) return alert("Please fill in all fields.");

    try {
      const endpoint = role === 'COMMUTER' ? '/api/auth/register/commuter' : '/api/auth/register/driver';
      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const message = await response.text();
      alert(message);
      if (response.ok) window.location.href = "/login";
    } catch (e) { 
      alert("Backend Connection Failed"); 
    }
  };

  return (
    <div className="min-h-screen bg-[#FFD217] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl flex flex-col items-center">
        
        {/* TAXI HERO LOGO */}
        <div className="w-20 h-20 bg-[#FFD217] rounded-full flex items-center justify-center mb-4 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="black" className="w-10 h-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.806H8.044a2.056 2.056 0 0 0-1.58.806c-1.22 1.534-2.18 3.265-2.845 5.122m14.547 4.071a1.875 1.875 0 1 1-3.75 0m3.75 0V14.25m-8.25 4.5V14.25M6.75 14.25H19.5" />
          </svg>
        </div>        

        <h1 className="text-4xl font-black text-[#1A1A1A] mb-1">e-Tekisi</h1>
        <p className="text-gray-400 text-[13px] font-bold mb-8 tracking-tight text-center">South Africa's Smart Taxi Gateway</p>

        <div className="w-full bg-gray-100 p-1.5 rounded-2xl flex mb-8">
          <button onClick={() => setRole('COMMUTER')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${role === 'COMMUTER' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Commuter</button>
          <button onClick={() => setRole('DRIVER')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${role === 'DRIVER' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Driver</button>
        </div>

        <div className="w-full space-y-4">
          <input className="w-full p-4 bg-[#1A1A1A] text-white rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Full Name" onChange={e => setFormData({...formData, fullName: e.target.value})} />
          <input className="w-full p-4 bg-[#1A1A1A] text-white rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Email" onChange={e => setFormData({...formData, email: e.target.value})} />
          <input className="w-full p-4 bg-[#1A1A1A] text-white rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Phone Number" onChange={e => setFormData({...formData, phoneNumber: e.target.value})} />
          
          {role === 'DRIVER' && (
            <input className="w-full p-4 bg-[#1A1A1A] text-white rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Taxi Plate (e.g. GP 123)" onChange={e => setFormData({...formData, taxiPlate: e.target.value})} />
          )}

          <div className="relative">
            <input type={showPass ? "text" : "password"} className="w-full p-4 bg-[#1A1A1A] text-white rounded-2xl outline-none" placeholder="Password" onChange={e => setFormData({...formData, password: e.target.value})} />
            <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-5 text-[10px] font-black text-gray-500 uppercase">{showPass ? "Hide" : "Show"}</button>
          </div>

          <div className="relative">
            <input type={showConfirm ? "text" : "password"} className="w-full p-4 bg-[#1A1A1A] text-white rounded-2xl outline-none" placeholder="Confirm Password" onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
            <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-5 text-[10px] font-black text-gray-500 uppercase">{showConfirm ? "Hide" : "Show"}</button>
          </div>
        </div>

        <button onClick={handleRegister} className="w-full bg-[#1A1A1A] text-white font-black py-5 rounded-2xl mt-8 shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
          REGISTER NOW
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </button>
        <p className="text-center mt-6 text-sm font-bold text-gray-400">Already have an account? <Link href="/login" className="text-black underline">Login</Link></p>
      </div>
    </div>
  );
}