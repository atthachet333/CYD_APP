"use client";

import { useState, useEffect } from "react";

export default function DashboardPopup() {
  // สร้าง State ควบคุมการเปิด/ปิด Popup (เริ่มต้นเป็น false ไว้ก่อน)
  const [isOpen, setIsOpen] = useState(false);

  // ให้ Popup เด้งขึ้นมาอัตโนมัติเมื่อโหลดหน้าจอเสร็จ
  useEffect(() => {
    // หน่วงเวลา 0.5 วินาทีให้โหลดหน้าเว็บเสร็จก่อนค่อยเด้ง จะดู Smooth ขึ้นครับ
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // ถ้าถูกสั่งปิด ก็จะไม่แสดงอะไร
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f2b6f]/40 backdrop-blur-sm transition-all">
      {/* กล่อง Popup */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* ส่วนหัว Popup (สีน้ำเงินเข้มตามธีมระบบ) */}
        <div className="bg-[#1e3a8a] px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
            <h2 className="font-extrabold text-lg">ประกาศจากระบบ</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-blue-200 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* ส่วนเนื้อหา */}
        <div className="p-6">
          <h3 className="font-bold text-[#111c44] text-lg mb-2">ยินดีต้อนรับเข้าสู่ระบบจัดการเอกสาร</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            นี่คือพื้นที่สำหรับแสดงข้อความแจ้งเตือน อัปเดตฟีเจอร์ใหม่ หรือประกาศสำคัญที่ต้องการให้ Admin และ Staff ทราบเมื่อล็อกอินเข้าสู่ระบบ
          </p>
          
          {/* ปุ่มกดรับทราบ */}
          <button 
            onClick={() => setIsOpen(false)} 
            className="w-full py-3 bg-[#4318FF] hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors"
          >
            รับทราบและเข้าสู่ระบบ
          </button>
        </div>

      </div>
    </div>
  );
}