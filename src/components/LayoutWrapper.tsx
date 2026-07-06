"use client";

import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const Bars3Icon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>);
const XMarkIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  // 1. หน้า Login โล่งๆ
  if (pathname === "/login") {
    return <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">{children}</div>;
  }

  // 2. หน้า Dashboard ปลดล็อก z-index ให้ป๊อปอัปทะลุได้
  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 antialiased overflow-hidden">
      
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 z-40 shrink-0">
        <Sidebar />
      </aside>

      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)}></div>
          <div className="relative w-64 bg-white h-full shadow-xl flex flex-col z-50">
            <div className="p-3 flex justify-end border-b border-gray-100">
              <button onClick={() => setIsMobileSidebarOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><XMarkIcon /></button>
            </div>
            <div className="flex-1 overflow-y-auto"><Sidebar /></div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Topbar มือถือ (ย่อให้บางลงแล้ว) */}
        <div className="lg:hidden flex items-center justify-between bg-white px-4 py-2 border-b border-gray-200 z-30 shadow-sm">
          <span className="font-extrabold text-[#0f2b6f] text-sm tracking-wide">CHAIYADETPROGRESS</span>
          <button onClick={() => setIsMobileSidebarOpen(true)} className="p-1.5 text-[#0f2b6f] bg-blue-50/50 hover:bg-blue-100 rounded-md transition-colors">
            <Bars3Icon />
          </button>
        </div>

        {/* Topbar คอม */}
        <div className="hidden lg:block w-full z-30 bg-white border-b border-gray-100">
          <Topbar />
        </div>

        {/* ปล่อยโล่ง ไม่กั้น z-index */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-0 custom-scrollbar">
          {children}
        </main>

      </div>
    </div>
  );
}