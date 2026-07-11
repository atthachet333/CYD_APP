// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
    } else if (res?.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex min-h-[100dvh] w-full items-center justify-center overflow-y-auto bg-[#f1f5f9] p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-5 shadow-xl sm:p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#0f2b6f] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <img src="/logo.png" alt="Logo" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f2b6f]">เข้าสู่ระบบ</h1>
          <p className="text-gray-500 text-sm mt-2">CHAIYADETPROGRESS Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อผู้ใช้งาน</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="text-slate-900 w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#f59e0b] outline-none transition-all"
              placeholder="Username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">รหัสผ่าน</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-slate-900 w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#f59e0b] outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && <div className="break-words rounded-lg border border-red-100 bg-red-50 p-3 text-center text-xs font-semibold text-red-500">{error}</div>}

          <button type="submit" className="w-full bg-[#0f2b6f] hover:bg-[#173685] text-white font-bold py-3.5 rounded-xl transition-colors shadow-md">
            ลงชื่อเข้าใช้ระบบ
          </button>
        </form>
      </div>
    </div>
  );
}
