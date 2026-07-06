"use client";

import { useState } from "react";
import Sidebar from "./components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      
      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        

        <header className="bg-white p-4 border-b border-slate-100 flex items-center shadow-sm z-10 h-[73px]">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 mr-4 rounded-xl bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 transition-all flex-shrink-0"
          >
  
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <span className="font-bold text-slate-800 text-lg">เมนูระบบ</span>
        </header>

        <div className="flex-1 overflow-auto relative">
          {children}
        </div>
        
      </main>
    </div>
  );
}