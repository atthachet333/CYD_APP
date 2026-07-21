// src/app/company-dashboard/SpxRegistrationSection.tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface SpxRegistrationSectionProps {
  companyName: string;
  companyId: number;
}

const HEALTHCARE_RIGHTS_OPTIONS = [
  "ประกันสังคม",
  "ใบประกันสุขภาพ",
  "ไม่มี",
];

export default function SpxRegistrationSection({
  companyName,
  companyId,
}: SpxRegistrationSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, isSubmitting]);

  const isSPX =
    companyName.toUpperCase().includes("SPX") ||
    companyName.includes("เอสพีเอ็กซ์");

  if (!isSPX) return null;

  const handleManualSubmit = async () => {
    if (!formRef.current) return;
    if (!formRef.current.reportValidity()) return;

    setIsSubmitting(true);

    const formData = new FormData(formRef.current);
    const endpoint = "/api/employee/create";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch (error) {}

      if (response.ok && data?.ok !== false) {
        if (data?.approval_requests?.length > 0) {
          alert("สร้างพนักงานและส่งคำขออนุมัติเอกสารแล้ว");
        } else {
          alert("บันทึกข้อมูลพนักงานสำเร็จ!");
        }
        setIsOpen(false);
        window.location.reload();
      } else {
        alert(`เกิดข้อผิดพลาด: ${data?.error || text || "ไม่สามารถบันทึกข้อมูลได้"}`);
      }
    } catch (error) {
      alert("ระบบขัดข้อง ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(true)}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3b82f6] px-6 py-2.5 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-[#2563eb] sm:w-auto sm:rounded-full"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        <span>ลงทะเบียนข้อมูลพนักงาน</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="spx-registration-title" className="max-h-[calc(100dvh-1rem)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-100 bg-white font-sans text-gray-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:max-h-[90dvh]">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-gray-100 bg-white p-4 shadow-sm sm:items-center sm:p-6">
              <div className="min-w-0">
                <h3 id="spx-registration-title" className="break-words text-lg font-extrabold text-[#111c44] sm:text-xl">ลงทะเบียนข้อมูลพนักงาน (เอกสาร)</h3>
                <p className="text-sm font-bold text-blue-600 mt-1">เฉพาะสาขา: {companyName}</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2 rounded-xl transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ฟอร์มข้อมูลพนักงาน */}
            <form ref={formRef} className="space-y-6 p-4 text-sm sm:p-6 md:p-8">
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">รหัสพนักงาน</label>
                <input type="text" name="emp_code" placeholder="เช่น SPX-001" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-colors" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">ชื่อภาษาไทย</label>
                  <input type="text" name="first_name_th" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">นามสกุลภาษาไทย</label>
                  <input type="text" name="last_name_th" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">ชื่อภาษาอังกฤษ</label>
                  <input type="text" name="first_name_en" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 uppercase bg-gray-50/50 focus:bg-white" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">นามสกุลภาษาอังกฤษ</label>
                  <input type="text" name="last_name_en" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 uppercase bg-gray-50/50 focus:bg-white" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">เพศ</label>
                  <select name="gender" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white">
                    <option value="">-- เลือกเพศ --</option>
                    <option value="Male">ชาย (Male)</option>
                    <option value="Female">หญิง (Female)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">วันเดือนปีเกิด (ค.ศ.)</label>
                  <input type="date" name="birth_date" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white text-gray-600" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5">บริษัท <span className="text-red-500">*</span></label>
                <div className="w-full px-4 py-3 border border-blue-200 rounded-xl bg-blue-50 text-blue-800 font-extrabold cursor-not-allowed">{companyName}</div>
                <input type="hidden" name="company_name_val" value={companyName} />
                <input type="hidden" name="company_id" value={companyId} />
              </div>

              {/* ✅ ปรับเป็น 3 คอลัมน์ */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">ยอดค้างชำระ (บาท)</label>
                  <input type="number" step="0.01" name="debt_amount" defaultValue="0.00" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">ประเภทเวิร์ค</label>
                  <select name="work_type_id" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white text-gray-700">
                    <option value="">-- เลือกประเภทเวิร์ค --</option>
                    <option value="1">MOU</option>
                    <option value="2">มติ ครม. 11 พ.ย. 68</option>
                    <option value="3">มติ ครม. 2 ธ.ค. 68</option>
                    <option value="4">มติ ครม. 24 ก.ย. 67</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">สิทธิรักษาสุขภาพ</label>
                  <select name="healthcare_rights" defaultValue="ไม่มี" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white text-gray-700">
                    {HEALTHCARE_RIGHTS_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 🟢 ส่วนอัปโหลดไฟล์ 6 ช่อง (UI แบบใหม่) */}
              <div className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-4 sm:p-6">
                <h4 className="font-bold text-gray-800 text-base">
                  อัปโหลดเอกสารพนักงาน <span className="text-red-500 text-sm font-normal">(เฉพาะสาขา Soce Soce Socw fsocw)</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Passport */}
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:border-blue-400 transition-colors">
                    <label className="block font-bold text-gray-800 mb-2 text-xs">1. หนังสือเดินทาง (Passport - PP)</label>
                    <label className="flex w-full cursor-pointer items-center rounded-xl border border-gray-200 bg-white transition hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/50 overflow-hidden shadow-sm">
                      <span className="px-4 py-2.5 bg-blue-50 text-blue-700 text-xs font-bold border-r border-gray-200 whitespace-nowrap">เลือกไฟล์</span>
                      <span className="px-4 py-2.5 text-xs text-gray-500 truncate w-full">ไม่ได้เลือกไฟล์ใด</span>
                      <input type="file" name="passport_document" accept=".pdf,image/*" className="hidden" onChange={(e) => { e.target.parentElement?.children[1] && (e.target.parentElement.children[1].textContent = e.target.files?.[0]?.name || "ไม่ได้เลือกไฟล์ใด"); }} />
                    </label>
                  </div>

                  {/* 2. Visa */}
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:border-blue-400 transition-colors">
                    <label className="block font-bold text-gray-800 mb-2 text-xs">2. วีซ่า (Visa - VS)</label>
                    <label className="flex w-full cursor-pointer items-center rounded-xl border border-gray-200 bg-white transition hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/50 overflow-hidden shadow-sm">
                      <span className="px-4 py-2.5 bg-blue-50 text-blue-700 text-xs font-bold border-r border-gray-200 whitespace-nowrap">เลือกไฟล์</span>
                      <span className="px-4 py-2.5 text-xs text-gray-500 truncate w-full">ไม่ได้เลือกไฟล์ใด</span>
                      <input type="file" name="visa_document" accept=".pdf,image/*" className="hidden" onChange={(e) => { e.target.parentElement?.children[1] && (e.target.parentElement.children[1].textContent = e.target.files?.[0]?.name || "ไม่ได้เลือกไฟล์ใด"); }} />
                    </label>
                  </div>

                  {/* 3. Work Permit */}
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:border-blue-400 transition-colors">
                    <label className="block font-bold text-gray-800 mb-2 text-xs">3. ใบอนุญาตทำงาน (Work Permit)</label>
                    <label className="flex w-full cursor-pointer items-center rounded-xl border border-gray-200 bg-white transition hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/50 overflow-hidden shadow-sm">
                      <span className="px-4 py-2.5 bg-blue-50 text-blue-700 text-xs font-bold border-r border-gray-200 whitespace-nowrap">เลือกไฟล์</span>
                      <span className="px-4 py-2.5 text-xs text-gray-500 truncate w-full">ไม่ได้เลือกไฟล์ใด</span>
                      <input type="file" name="work_permit_document" accept=".pdf,image/*" className="hidden" onChange={(e) => { e.target.parentElement?.children[1] && (e.target.parentElement.children[1].textContent = e.target.files?.[0]?.name || "ไม่ได้เลือกไฟล์ใด"); }} />
                    </label>
                  </div>

                  {/* 4. 90 Days */}
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:border-blue-400 transition-colors">
                    <label className="block font-bold text-gray-800 mb-2 text-xs">4. รายงานตัว 90 วัน (90D)</label>
                    <label className="flex w-full cursor-pointer items-center rounded-xl border border-gray-200 bg-white transition hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/50 overflow-hidden shadow-sm">
                      <span className="px-4 py-2.5 bg-blue-50 text-blue-700 text-xs font-bold border-r border-gray-200 whitespace-nowrap">เลือกไฟล์</span>
                      <span className="px-4 py-2.5 text-xs text-gray-500 truncate w-full">ไม่ได้เลือกไฟล์ใด</span>
                      <input type="file" name="ninety_day_document" accept=".pdf,image/*" className="hidden" onChange={(e) => { e.target.parentElement?.children[1] && (e.target.parentElement.children[1].textContent = e.target.files?.[0]?.name || "ไม่ได้เลือกไฟล์ใด"); }} />
                    </label>
                  </div>

                  {/* 5. ใบเก็บอัตลักษณ์ */}
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:border-blue-400 transition-colors">
                    <label className="block font-bold text-gray-800 mb-2 text-xs">5. ใบเก็บอัตลักษณ์</label>
                    <label className="flex w-full cursor-pointer items-center rounded-xl border border-gray-200 bg-white transition hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/50 overflow-hidden shadow-sm">
                      <span className="px-4 py-2.5 bg-blue-50 text-blue-700 text-xs font-bold border-r border-gray-200 whitespace-nowrap">เลือกไฟล์</span>
                      <span className="px-4 py-2.5 text-xs text-gray-500 truncate w-full">ไม่ได้เลือกไฟล์ใด</span>
                      <input type="file" name="identity_document" accept=".pdf,image/*" className="hidden" onChange={(e) => { e.target.parentElement?.children[1] && (e.target.parentElement.children[1].textContent = e.target.files?.[0]?.name || "ไม่ได้เลือกไฟล์ใด"); }} />
                    </label>
                  </div>

                  {/* 6. โปรไฟล์พนักงาน */}
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:border-blue-400 transition-colors">
                    <label className="block font-bold text-gray-800 mb-2 text-xs">6. โปรไฟล์พนักงาน</label>
                    <label className="flex w-full cursor-pointer items-center rounded-xl border border-gray-200 bg-white transition hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/50 overflow-hidden shadow-sm">
                      <span className="px-4 py-2.5 bg-blue-50 text-blue-700 text-xs font-bold border-r border-gray-200 whitespace-nowrap">เลือกไฟล์</span>
                      <span className="px-4 py-2.5 text-xs text-gray-500 truncate w-full">ไม่ได้เลือกไฟล์ใด</span>
                      <input type="file" name="profile_document" accept=".pdf,image/*" className="hidden" onChange={(e) => { e.target.parentElement?.children[1] && (e.target.parentElement.children[1].textContent = e.target.files?.[0]?.name || "ไม่ได้เลือกไฟล์ใด"); }} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 sm:p-6">
                <h3 className="font-bold text-gray-800 mb-5 text-base">ข้อมูลวันสำคัญ (แก้ไขเองได้)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">เลขพาสปอร์ต</label>
                    <input type="text" name="passport_number" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl uppercase focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">วันหมดอายุพาสปอร์ต</label>
                    <input type="date" name="passport_expiry_date" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-gray-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">เลขที่วีซ่า</label>
                    <input type="text" name="visa_number" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl uppercase focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">วันหมดอายุวีซ่า</label>
                    <input type="date" name="visa_expiry_date" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-gray-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">เลขใบอนุญาตทำงาน</label>
                    <input type="text" name="work_permit_number" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl uppercase focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">วันหมดอายุใบอนุญาตทำงาน</label>
                    <input type="date" name="work_permit_expiry_date" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-gray-600" />
                  </div>
                  
                  {/* ✅ วันรายงานตัว 90 วัน กินพื้นที่ 2 คอลัมน์เต็มตามเดิม */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">วันรายงานตัว 90 วันล่าสุด</label>
                    <input type="date" name="ninety_day_report_date" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-gray-600" />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 flex flex-col-reverse items-stretch justify-end gap-2 border-t border-gray-200 bg-white pb-2 pt-4 sm:flex-row sm:items-center sm:pt-6">
                <button type="button" onClick={() => setIsOpen(false)} disabled={isSubmitting} className="min-h-11 rounded-xl px-6 py-3 text-sm font-bold text-gray-500 transition-all hover:bg-gray-100 disabled:opacity-50">
                  ยกเลิก
                </button>
                <button type="button" onClick={handleManualSubmit} disabled={isSubmitting} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-bold text-white shadow-md transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70">
                  {isSubmitting ? <span>กำลังบันทึก...</span> : <span>บันทึกข้อมูลพนักงาน</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}