"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const Bars3Icon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>);
const XMarkIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarPath, setMobileSidebarPath] = useState<string | null>(null);
  const isMobileSidebarOpen = mobileSidebarPath === pathname;

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarPath(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMobileSidebarOpen]);

  // 1. หน้า Login โล่งๆ
  if (pathname === "/login") {
    return <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">{children}</div>;
  }

  // 2. หน้า Dashboard ปลดล็อก z-index ให้ป๊อปอัปทะลุได้
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50 font-sans text-gray-800 antialiased">
      
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 z-40 shrink-0">
        <Sidebar />
      </aside>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button type="button" aria-label="ปิดเมนู" className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarPath(null)} />
          <div role="dialog" aria-modal="true" aria-label="เมนูหลัก" className="relative z-50 flex h-full w-64 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="p-3 flex justify-end border-b border-gray-100">
              <button type="button" aria-label="ปิดเมนู" onClick={() => setMobileSidebarPath(null)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"><XMarkIcon /></button>
            </div>
            <div className="flex-1 overflow-y-auto"><Sidebar onNavigate={() => setMobileSidebarPath(null)} /></div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Topbar มือถือ (ย่อให้บางลงแล้ว) */}
        <div className="z-30 flex min-h-14 items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-2 shadow-sm sm:px-4 lg:hidden">
          <span className="truncate text-sm font-extrabold text-[#0f2b6f]">CHAIYADETPROGRESS</span>
          <button type="button" aria-label="เปิดเมนู" aria-expanded={isMobileSidebarOpen} onClick={() => setMobileSidebarPath(pathname)} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md bg-blue-50/50 text-[#0f2b6f] transition-colors hover:bg-blue-100">
            <Bars3Icon />
          </button>
        </div>

        {/* Topbar คอม */}
        <div className="hidden lg:block w-full z-30 bg-white border-b border-gray-100">
          <Topbar />
        </div>

        {/* ปล่อยโล่ง ไม่กั้น z-index */}
        <main className="custom-scrollbar min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50 p-0">
          {children}
        </main>

      </div>
    </div>
  );
}
