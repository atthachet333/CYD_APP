"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import SecureDocumentButton from "@/components/SecureDocumentButton";

type EmployeeRow = {
  id: number;
  emp_code: string | null;
  employeeName: string;
  passport_number: string | null;
  passport_no: string | null;
  passport_expiry_date: string | null;
  has_passport_file: boolean;
};

function formatThaiDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

function toInputDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function daysRemaining(value: string | null) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function statusFor(value: string | null) {
  const days = daysRemaining(value);
  if (days === null) return { label: "ยังไม่มีข้อมูล", color: "bg-gray-100 text-gray-600", daysText: "-" };
  if (days < 0) return { label: "หมดอายุแล้ว", color: "bg-red-100 text-red-700", daysText: `ผ่านมาแล้ว ${Math.abs(days)} วัน` };
  if (days <= 7) return { label: "ใกล้หมดอายุ", color: "bg-orange-100 text-orange-700", daysText: `เหลืออีก ${days} วัน` };
  return { label: "ปกติ", color: "bg-green-100 text-green-700", daysText: `เหลืออีก ${days} วัน` };
}

function passportNumber(employee: EmployeeRow) {
  return employee.passport_number || employee.passport_no || "";
}

export default function PassportRenewalClient({ employees }: { employees: EmployeeRow[] }) {
  const router = useRouter();

  const [activeEmployee, setActiveEmployee] = useState<EmployeeRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ✅ State สำหรับ Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (!activeEmployee) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) setActiveEmployee(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeEmployee, submitting]);

  async function submit(formData: FormData) {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/document-renewals", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "บันทึกการต่อพาสปอร์ตไม่สำเร็จ");
      setSuccess("บันทึกการต่อพาสปอร์ตสำเร็จ");
      setActiveEmployee(null);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "บันทึกการต่อพาสปอร์ตไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setCurrentPage(1);
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const keyword = search.toLowerCase().trim();
      const num = passportNumber(emp).toLowerCase();
      const matchSearch =
        !keyword ||
        (emp.employeeName || "").toLowerCase().includes(keyword) ||
        (emp.emp_code || "").toLowerCase().includes(keyword) ||
        num.includes(keyword);

      const statusObj = statusFor(emp.passport_expiry_date);
      let matchStatus = true;

      if (statusFilter === "overdue") matchStatus = statusObj.label === "หมดอายุแล้ว";
      if (statusFilter === "expiring_soon") matchStatus = statusObj.label === "ใกล้หมดอายุ";
      if (statusFilter === "normal") matchStatus = statusObj.label === "ปกติ";
      if (statusFilter === "no_data") matchStatus = statusObj.label === "ยังไม่มีข้อมูล";

      return matchSearch && matchStatus;
    });
  }, [employees, search, statusFilter]);

  // ✅ คำนวณข้อมูลสำหรับ Pagination
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE) || 1;
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
             <span className="w-2 h-6 bg-blue-600 rounded-full inline-block"></span> 
             รายการที่ต้องดำเนินการ
          </h3>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] items-end">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">ค้นหาพนักงาน (ชื่อ, รหัส, เลข Passport)</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="พิมพ์ค้นหา..."
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">กรองตามสถานะ</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                <option value="all">-- แสดงทั้งหมด --</option>
                <option value="overdue">หมดอายุแล้ว</option>
                <option value="expiring_soon">ใกล้หมดอายุ (ภายใน 7 วัน)</option>
                <option value="normal">ปกติ (เหลือมากกว่า 7 วัน)</option>
                <option value="no_data">ยังไม่มีข้อมูล</option>
              </select>
            </div>
            <div className="flex">
              <button
                type="button"
                onClick={clearFilters}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-300 transition text-center flex items-center justify-center w-full sm:w-auto"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>
        </div>

        {error && <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        {success && <div className="m-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">{success}</div>}
        
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1080px]">
            <thead className="bg-slate-50/80 text-gray-500 border-b border-gray-100 uppercase tracking-wider text-[11px] md:text-xs">
              <tr>
                <th className="p-4 pl-6 font-bold">ชื่อ-นามสกุล</th>
                <th className="p-4 font-bold">รหัสพนักงาน</th>
                <th className="p-4 font-bold">เลข Passport</th>
                <th className="p-4 font-bold text-center">วันหมดอายุ</th>
                <th className="p-4 font-bold text-center">เวลาที่เหลือ</th>
                <th className="p-4 font-bold text-center">สถานะ</th>
                <th className="p-4 font-bold text-center">ไฟล์</th>
                <th className="p-4 font-bold text-center pr-6">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedEmployees.map((employee) => {
                const status = statusFor(employee.passport_expiry_date);
                const number = passportNumber(employee);
                return (
                  <tr key={employee.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4 pl-6 font-bold text-gray-800">{employee.employeeName}</td>
                    <td className="p-4 font-bold text-blue-700">{employee.emp_code || "-"}</td>
                    <td className="p-4 font-medium text-gray-600">{number || "-"}</td>
                    <td className="p-4 text-center font-medium text-gray-600">{formatThaiDate(employee.passport_expiry_date)}</td>
                    <td className="p-4 text-center font-bold text-gray-800">{status.daysText}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {employee.has_passport_file ? (
                        <SecureDocumentButton employeeId={employee.id} documentType="passport" className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-bold text-blue-600 shadow-sm transition-all hover:bg-blue-600 hover:text-white">
                          เปิดดูไฟล์
                        </SecureDocumentButton>
                      ) : (
                        <span className="inline-flex px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-400">ยังไม่มีไฟล์</span>
                      )}
                    </td>
                    <td className="p-4 text-center pr-6">
                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setSuccess("");
                          setActiveEmployee(employee);
                        }}
                        className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
                      >
                        ต่อพาสปอร์ต
                      </button>
                    </td>
                  </tr>
                );
              })}
              {paginatedEmployees.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-400 font-medium">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm font-medium text-gray-500">
              แสดง {(currentPage - 1) * ITEMS_PER_PAGE + 1} ถึง {Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)} จากทั้งหมด {filteredEmployees.length} รายการ
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                &laquo; ก่อนหน้า
              </button>
              
              <div className="flex items-center gap-1 hidden sm:flex">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-bold shadow-sm transition-colors ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return <span key={pageNum} className="px-2 text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                ถัดไป &raquo;
              </button>
            </div>
          </div>
        )}
      </div>

      {activeEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#111c44]">บันทึกการต่อพาสปอร์ต</h2>
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">Passport Renewal</p>
                </div>
              </div>
              <button onClick={() => !submitting && setActiveEmployee(null)} className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-gray-100">
                ✖
              </button>
            </div>

            <form
              className="flex flex-col overflow-hidden"
              onSubmit={(event) => {
                event.preventDefault();
                submit(new FormData(event.currentTarget));
              }}
            >
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/80 p-5 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 mb-1">พนักงาน</p>
                    <p className="font-bold text-sm text-gray-900">{activeEmployee.employeeName}</p>
                    <p className="text-xs text-blue-600 font-bold mt-0.5">{activeEmployee.emp_code || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 mb-1">ข้อมูลพาสปอร์ตเดิม</p>
                    <p className="font-bold text-sm text-gray-800">
                      เลขเดิม: <span className="font-medium text-gray-600">{passportNumber(activeEmployee) || "-"}</span>
                    </p>
                    <p className="font-bold text-sm text-gray-800 mt-0.5">
                      วันเดิม: <span className="font-medium text-red-500">{formatThaiDate(activeEmployee.passport_expiry_date)}</span>
                    </p>
                  </div>
                </div>

                <input type="hidden" name="employeeId" value={activeEmployee.id} />
                <input type="hidden" name="documentType" value="passport" />
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">เลข Passport ใหม่ <span className="text-red-500">*</span></label>
                    <input name="documentNumber" defaultValue={passportNumber(activeEmployee)} required placeholder="ระบุเลขที่พาสปอร์ต..." className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">วันหมดอายุใหม่ <span className="text-red-500">*</span></label>
                    <input type="date" name="expiryDate" required defaultValue={toInputDate(activeEmployee.passport_expiry_date)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">ไฟล์ Passport ใหม่ (ถ้ามี)</label>
                    <input type="file" name="passport_document" accept=".pdf,.png,.jpg,.jpeg,.webp" className="w-full bg-white border border-gray-200 rounded-xl text-sm shadow-sm file:mr-4 file:py-3 file:px-4 file:rounded-l-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer" />
                    {activeEmployee.has_passport_file && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-gray-500">ไฟล์เดิมในระบบ:</span>
                        <SecureDocumentButton employeeId={activeEmployee.id} documentType="passport" className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-bold hover:bg-gray-200 transition-colors">เปิดดูไฟล์เดิม</SecureDocumentButton>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">หมายเหตุเพิ่มเติม</label>
                    <textarea name="note" placeholder="ระบุหมายเหตุการต่อพาสปอร์ต..." className="min-h-[100px] w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm resize-y custom-scrollbar" />
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button type="button" disabled={submitting} onClick={() => setActiveEmployee(null)} className="px-6 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 text-sm font-bold shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50">ยกเลิก</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[140px]">
                  {submitting ? "กำลังบันทึก..." : "บันทึกการต่อพาสปอร์ต"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}