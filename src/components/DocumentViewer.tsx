"use client";
import React, { useState } from "react";

type Props = {
  empId: string;
  docType: string; // เช่น VS, PP, 90D
  title: string;   // เช่น "หนังสือเดินทาง (Passport)"
};

export default function DocumentViewer({ empId, docType, title }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ฟังก์ชันดึงไฟล์มาแสดง
  const handleView = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/documents/view?type=${docType}&empId=${empId}`);
      if (!res.ok) throw new Error("ไม่พบไฟล์เอกสาร");
      
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob)); // สร้าง Blob URL (เปิดจากเว็บนอกไม่ได้)
    } catch (err) {
      alert("ยังไม่มีเอกสารนี้ในระบบ หรือเกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <h4 className="font-bold text-gray-800 mb-4">{title}</h4>
      
      {/* จัดปุ่ม 4 ปุ่ม ตามรูปที่คุณส่งมา */}
      <div className="grid grid-cols-2 gap-3">
        {/* ปุ่ม: ดูเอกสาร */}
        <button 
          type="button"
          onClick={handleView}
          disabled={isLoading}
          className="py-2.5 rounded-xl font-semibold text-[#1e5bff] bg-[#f0f4ff] hover:bg-[#e0eaff] transition-colors"
        >
          {isLoading ? "กำลังโหลด..." : "ดูเอกสาร"}
        </button>

        {/* ปุ่ม: แก้ไข */}
        <button 
          type="button"
          className="py-2.5 rounded-xl font-semibold text-white bg-[#1a56db] hover:bg-[#1546b3] shadow-sm transition-colors"
        >
          แก้ไข
        </button>

        {/* ปุ่ม: ย้ายบริษัท */}
        <button 
          type="button"
          className="py-2.5 rounded-xl font-semibold text-[#1e5bff] bg-[#f0f4ff] hover:bg-[#e0eaff] transition-colors"
        >
          ย้ายบริษัท
        </button>

        {/* ปุ่ม: ลบ */}
        <button 
          type="button"
          className="py-2.5 rounded-xl font-semibold text-[#e02424] bg-[#fdf2f2] hover:bg-[#fde8e8] transition-colors"
        >
          ลบ
        </button>
      </div>

      {/* ---------------- Modal Popup แสดงเอกสาร ---------------- */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">{title} - รหัสพนักงาน: {empId}</h3>
              <button 
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                className="text-gray-500 hover:text-red-500 font-bold text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 bg-gray-100">
              {/* แสดง PDF ผ่าน iframe โดยใช้ Blob URL ปลอดภัย 100% */}
              <iframe src={previewUrl} className="w-full h-full border-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}