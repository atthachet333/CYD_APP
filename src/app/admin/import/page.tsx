"use client";

import { useState, useRef } from "react";

export default function ImportDocumentPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // จัดการเมื่อลากไฟล์เข้ามาในพื้นที่
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // จัดการเมื่อปล่อยไฟล์ลงในพื้นที่
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // จัดการเมื่อกดปุ่มเลือกไฟล์
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // ตรวจสอบไฟล์ที่เลือก (รับเฉพาะ .xlsx, .xls, .csv)
  const handleFile = (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv" // .csv
    ];
    
    if (validTypes.includes(file.type) || file.name.endsWith('.csv')) {
      setSelectedFile(file);
    } else {
      alert("กรุณาอัปโหลดไฟล์ Excel (.xlsx, .xls) หรือ CSV เท่านั้นครับ");
    }
  };

  // จำลองการอัปโหลด
  const handleUpload = () => {
    if (!selectedFile) return;
    alert(`กำลังเตรียมนำเข้าข้อมูลจากไฟล์: ${selectedFile.name}\n(ระบบนี้รอดำเนินการต่อยอดเชื่อม API backend)`);
    // รีเซ็ตหลังอัปโหลดเสร็จ
    setSelectedFile(null);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-screen-2xl bg-[#f4f7fe] p-4 font-sans text-gray-800 sm:p-6 md:p-8">
      
      {/* ส่วนหัวหน้าจอ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#111c44] tracking-tight">Import เอกสาร / ข้อมูล</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">นำเข้าข้อมูลพนักงานหรือเอกสารจำนวนมากผ่านไฟล์ Excel หรือ CSV</p>
          </div>
        </div>
        <button className="bg-white border-2 border-[#4318FF] text-[#4318FF] hover:bg-blue-50 px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          ดาวน์โหลดไฟล์ Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* คอลัมน์ซ้าย: กล่องอัปโหลดไฟล์ */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-bold text-[#111c44] mb-4">อัปโหลดไฟล์ข้อมูล</h2>
            
            <form onDragEnter={handleDrag} onSubmit={(e) => e.preventDefault()}>
              <input ref={inputRef} type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleChange} />
              
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-200 
                  ${dragActive ? 'border-[#4318FF] bg-blue-50/50' : 'border-gray-300 hover:border-[#4318FF]/50 hover:bg-gray-50'}
                  ${selectedFile ? 'border-emerald-500 bg-emerald-50/30' : ''}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {!selectedFile ? (
                  <>
                    <div className="w-16 h-16 bg-blue-50 text-[#4318FF] rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    </div>
                    <p className="text-gray-700 font-bold text-lg mb-1">ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์</p>
                    <p className="text-sm text-gray-500 mb-6">รองรับไฟล์ Excel (.xlsx, .xls) หรือ CSV ขนาดไม่เกิน 10MB</p>
                    <button 
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="bg-[#111c44] hover:bg-[#0f2b6f] text-white px-6 py-2.5 rounded-lg font-bold transition-colors shadow-md"
                    >
                      เลือกไฟล์จากเครื่อง
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <p className="text-emerald-700 font-bold text-lg mb-1">ไฟล์พร้อมสำหรับการนำเข้าแล้ว</p>
                    {/* ตรงนี้คือจุดที่แก้แท็กเปิดปิดให้ตรงกันครับ */}
                    <div className="mb-4 inline-flex max-w-full flex-wrap items-center gap-2 break-all rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>
                      {selectedFile.name}
                      <span className="text-xs text-gray-400 ml-2">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    
                    <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                      <button 
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-gray-500 hover:text-red-500 font-bold text-sm px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button 
                        type="button"
                        onClick={handleUpload}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-md flex items-center gap-2"
                      >
                        ยืนยันการนำเข้าข้อมูล
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* คอลัมน์ขวา: คำแนะนำ */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-[#111c44] font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              คำแนะนำการ Import
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#4318FF] flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">1</span>
                <span>ดาวน์โหลดไฟล์ Template ก่อนเพื่อดูรูปแบบคอลัมน์ที่ระบบรองรับ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#4318FF] flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">2</span>
                <span>กรอกข้อมูลลงในไฟล์ให้ครบถ้วน โดยเฉพาะช่องที่มีเครื่องหมายดอกจัน (*)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#4318FF] flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">3</span>
                <span>ห้ามแก้ไขหรือลบหัวคอลัมน์ (Header) แถวแรกสุดของไฟล์ Template</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#4318FF] flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">4</span>
                <span>ตรวจสอบความถูกต้องของข้อมูล เช่น เลขพาสปอร์ต หรือวันที่ ให้ตรงตามรูปแบบก่อนนำเข้า</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-[#111c44] to-[#0f2b6f] rounded-2xl shadow-sm p-6 text-white relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <h3 className="font-bold mb-2">พบปัญหาการนำเข้า?</h3>
            <p className="text-sm text-blue-200 mb-4">หากอัปโหลดไฟล์แล้วแจ้งเตือน Error กรุณาตรวจสอบ Format วันที่ใน Excel หรือติดต่อผู้ดูแลระบบ</p>
            <button className="text-sm font-bold bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-lg w-full">
              ดูคู่มือการ Import
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
