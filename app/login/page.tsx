"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function Login() {
  const [role, setRole] = useState('COMMUTER');
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();

      if (data.status === 'SUCCESS') {
        localStorage.setItem('etekisi_session', JSON.stringify({
          userId: data.userId,
          role: data.role,
          loginTime: Date.now()
        }));
        window.location.href = data.role === 'DRIVER' ? "/driver" : "/";
      } else {
        alert("❌ " + data.message);
      }
    } catch (e) {
      alert("Backend Connection Failed");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 font-sans">
      
      {/* TAXI HERO LOGO */}
      <div className="w-20 h-20 bg-[#FFD217] rounded-full flex items-center justify-center mb-6 shadow-xl">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="black" className="w-10 h-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.806H8.044a2.056 2.056 0 0 0-1.58.806c-1.22 1.534-2.18 3.265-2.845 5.122m14.547 4.071a1.875 1.875 0 1 1-3.75 0m3.75 0V14.25m-8.25 4.5V14.25M6.75 14.25H19.5" />
        </svg>
      </div>

      <h1 className="text-4xl font-black mb-2 text-[#1A1A1A]">Welcome Back</h1>
      <p className="text-gray-400 font-bold mb-10 text-sm uppercase tracking-widest">Digital Taxi Gateway</p>

      <div className="w-full max-w-sm space-y-4">
        <div className="flex bg-gray-100 p-1 rounded-2xl mb-4 border border-gray-200">
          <button onClick={() => setRole('COMMUTER')} className={`flex-1 py-3 rounded-xl font-black text-xs ${role === 'COMMUTER' ? 'bg-white shadow text-black' : 'text-gray-400'}`}>COMMUTER</button>
          <button onClick={() => setRole('DRIVER')} className={`flex-1 py-3 rounded-xl font-black text-xs ${role === 'DRIVER' ? 'bg-white shadow text-black' : 'text-gray-400'}`}>DRIVER</button>
        </div>
        
        <input className="w-full p-5 bg-gray-50 rounded-[28px] border border-gray-100 outline-none font-bold text-black" placeholder="Email Address" onChange={e => setEmail(e.target.value)} />
        
        <div className="relative">
          <input type={showPass ? "text" : "password"} className="w-full p-5 bg-gray-50 rounded-[28px] border border-gray-100 outline-none font-bold text-black" placeholder="Password" onChange={e => setPassword(e.target.value)} />
          <button onClick={() => setShowPass(!showPass)} className="absolute right-5 top-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {showPass ? "Hide" : "Show"}
          </button>
        </div>

        <button onClick={handleLogin} className="w-full bg-[#FFD217] text-black font-black py-6 rounded-[28px] shadow-xl mt-6 active:scale-95 transition-all text-lg">
          LOGIN
        </button>
        
        <p className="text-center mt-8 text-sm font-bold text-gray-400">New to e-Tekisi? <Link href="/register" className="text-black underline">Create account</Link></p>
      </div>
    </div>
  );
}