"use client";

import { useState, useRef } from "react";

export default function UploadFormClient({ categories }: { categories: any[] }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    doc_no: "",
    title: "",
    category_id: "",
    description: "",
  });

  // จัดการเมื่อลากไฟล์
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // ฟังก์ชันกดปุ่มอัปโหลด (จำลอง)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("กรุณาแนบไฟล์เอกสารก่อนบันทึกครับ");
      return;
    }
    if (!formData.title || !formData.category_id) {
      alert("กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วนครับ");
      return;
    }
    alert(`กำลังบันทึกเอกสาร: ${formData.title}\nไฟล์: ${selectedFile.name}\n(รอเชื่อม API บันทึกลง Database)`);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* คอลัมน์ซ้าย: ข้อมูลเอกสาร */}
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-[#111c44] mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#4318FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            รายละเอียดเอกสาร
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">เลขที่เอกสาร (Doc No.)</label>
              <input 
                type="text" 
                placeholder="เช่น DOC-2026-001"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4318FF]/40 focus:bg-white transition-all text-sm text-gray-800"
                value={formData.doc_no}
                onChange={(e) => setFormData({...formData, doc_no: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">หมวดหมู่ <span className="text-red-500">*</span></label>
              <select 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4318FF]/40 focus:bg-white transition-all text-sm text-gray-800"
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                required
              >
                <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">ชื่อเอกสาร / หัวข้อ <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              placeholder="ตั้งชื่อเอกสารให้ชัดเจน..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4318FF]/40 focus:bg-white transition-all text-sm text-gray-800"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">รายละเอียดเพิ่มเติม / คำอธิบาย</label>
            <textarea 
              rows={4}
              placeholder="กรอกรายละเอียด หรือหมายเหตุของเอกสารฉบับนี้..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4318FF]/40 focus:bg-white transition-all text-sm text-gray-800 resize-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            ></textarea>
          </div>
        </div>
      </div>

      {/* คอลัมน์ขวา: พื้นที่แนบไฟล์ */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 flex flex-col h-full">
          <h2 className="text-lg font-bold text-[#111c44] mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#4318FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
            แนบไฟล์เอกสาร <span className="text-red-500">*</span>
          </h2>

          <div 
            className={`flex-1 relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all duration-200 min-h-[250px]
              ${dragActive ? 'border-[#4318FF] bg-blue-50/50' : 'border-gray-300 hover:border-[#4318FF]/50 hover:bg-gray-50'}
              ${selectedFile ? 'border-emerald-500 bg-emerald-50/30' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
            
            {!selectedFile ? (
              <>
                <div className="w-16 h-16 bg-blue-50 text-[#4318FF] rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                </div>
                <p className="text-gray-700 font-bold mb-1">ลากไฟล์มาวางที่นี่</p>
                <p className="text-[13px] text-gray-500 mb-4">รองรับ PDF, DOCX, XLSX, JPG ขนาดไม่เกิน 20MB</p>
                <button 
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold transition-colors text-sm"
                >
                  เปิดหาไฟล์
                </button>
              </>
            ) : (
              <div className="w-full flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <p className="text-emerald-700 font-bold mb-2 break-all">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mb-4">ขนาด: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                <button 
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-red-500 hover:bg-red-50 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors border border-red-100"
                >
                  เปลี่ยนไฟล์
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <button 
              type="submit"
              className="w-full bg-[#4318FF] hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              บันทึกและอัปโหลดเอกสาร
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}