"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SecureDocumentButton from "@/components/SecureDocumentButton";

type EmployeeRow = {
  id: number;
  emp_code: string | null;
  employeeName: string;
  ninety_day_number: string | null;
  ninety_day_report_date: string | null;
  report_90_days_date: string | null;
  ninety_day_file: string | null;
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
  if (days < 0) return { label: "เกินกำหนด", color: "bg-red-100 text-red-700", daysText: `ผ่านมาแล้ว ${Math.abs(days)} วัน` };
  if (days <= 7) return { label: "ใกล้ครบกำหนด", color: "bg-orange-100 text-orange-700", daysText: `เหลืออีก ${days} วัน` };
  return { label: "ปกติ", color: "bg-green-100 text-green-700", daysText: `เหลืออีก ${days} วัน` };
}

export default function NinetyDayRenewalClient({ employees }: { employees: EmployeeRow[] }) {
  const router = useRouter();
  const [activeEmployee, setActiveEmployee] = useState<EmployeeRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(formData: FormData) {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/document-renewals", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "บันทึกการต่อ 90 วันไม่สำเร็จ");
      setSuccess("บันทึกการต่อ 90 วันสำเร็จ");
      setActiveEmployee(null);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "บันทึกการต่อ 90 วันไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">รายการที่ต้องดำเนินการ</h3>
        </div>
        {error && <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        {success && <div className="m-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">{success}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 min-w-[1080px]">
            <thead className="bg-white text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold">ชื่อ-นามสกุล</th>
                <th className="px-6 py-4 font-semibold">รหัสพนักงาน</th>
                <th className="px-6 py-4 font-semibold">เลข 90 วัน</th>
                <th className="px-6 py-4 font-semibold text-center">วันที่ครบกำหนด</th>
                <th className="px-6 py-4 font-semibold text-center">เวลาที่เหลือ</th>
                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                <th className="px-6 py-4 font-semibold text-center">ไฟล์</th>
                <th className="px-6 py-4 font-semibold text-center">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((employee) => {
                const date = employee.ninety_day_report_date || employee.report_90_days_date;
                const status = statusFor(date);
                return (
                  <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{employee.employeeName}</td>
                    <td className="px-6 py-4 font-mono text-gray-500">{employee.emp_code || "-"}</td>
                    <td className="px-6 py-4 font-mono text-gray-500">{employee.ninety_day_number || "-"}</td>
                    <td className="px-6 py-4 text-center font-mono">{formatThaiDate(date)}</td>
                    <td className="px-6 py-4 text-center font-bold text-gray-700">{status.daysText}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {employee.ninety_day_file ? (
                        <SecureDocumentButton employeeId={employee.id} documentType="ninety_day" className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100">
                          เปิดดูไฟล์
                        </SecureDocumentButton>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-400 text-xs font-bold">ยังไม่มีไฟล์</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setSuccess("");
                          setActiveEmployee(employee);
                        }}
                        className="inline-flex min-w-[150px] items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-100"
                      >
                        ดำเนินการต่อ 90 วัน
                      </button>
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400">ไม่พบข้อมูลพนักงาน</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              submit(new FormData(event.currentTarget));
            }}
          >
            <h2 className="text-lg font-black text-gray-900 mb-2">บันทึกการต่อ 90 วัน</h2>
            <div className="mb-4 space-y-1 text-sm text-gray-600">
              <p><span className="font-bold text-gray-800">พนักงาน:</span> {activeEmployee.employeeName}</p>
              <p><span className="font-bold text-gray-800">รหัส:</span> {activeEmployee.emp_code || "-"}</p>
              <p><span className="font-bold text-gray-800">เลขเดิม:</span> {activeEmployee.ninety_day_number || "-"}</p>
              <p><span className="font-bold text-gray-800">วันที่เดิม:</span> {formatThaiDate(activeEmployee.ninety_day_report_date || activeEmployee.report_90_days_date)}</p>
            </div>
            <input type="hidden" name="employeeId" value={activeEmployee.id} />
            <input type="hidden" name="documentType" value="ninety_day" />
            <label className="block text-xs font-bold text-gray-500 mb-1">เลข 90 วันใหม่</label>
            <input name="documentNumber" defaultValue={activeEmployee.ninety_day_number || ""} className="mb-3 w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <label className="block text-xs font-bold text-gray-500 mb-1">วันที่ครบกำหนด/รายงานตัวใหม่</label>
            <input type="date" name="expiryDate" required defaultValue={toInputDate(activeEmployee.ninety_day_report_date || activeEmployee.report_90_days_date)} className="mb-3 w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <label className="block text-xs font-bold text-gray-500 mb-1">อัปโหลดเอกสาร 90 Days ใหม่</label>
            <input type="file" name="ninety_day_document" accept=".pdf,.png,.jpg,.jpeg,.webp" className="mb-3 w-full rounded-xl border border-gray-200 p-3 text-sm" />
            <label className="block text-xs font-bold text-gray-500 mb-1">หมายเหตุ</label>
            <textarea name="note" className="min-h-24 w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            {activeEmployee.ninety_day_file && (
              <div className="mt-3">
                <SecureDocumentButton employeeId={activeEmployee.id} documentType="ninety_day" className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100">
                  เปิดดูไฟล์เดิม
                </SecureDocumentButton>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" disabled={submitting} onClick={() => setActiveEmployee(null)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold disabled:opacity-50">
                ยกเลิก
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
                {submitting ? "กำลังบันทึก..." : "บันทึกการต่อ 90 วัน"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
