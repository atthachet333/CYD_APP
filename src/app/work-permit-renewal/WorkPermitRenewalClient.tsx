"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SecureDocumentButton from "@/components/SecureDocumentButton";

type EmployeeRow = {
  id: number;
  emp_code: string | null;
  employeeName: string;
  work_permit_number: string | null;
  work_permit_no: string | null;
  work_permit_expiry_date: string | null;
  has_work_permit_file: boolean;
};

const missing = <span className="text-slate-300">-</span>;

function formatThaiDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
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
  const base = "inline-flex min-w-[104px] items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold";

  if (days === null) return { label: "ยังไม่มีข้อมูล", className: `${base} bg-slate-100 text-slate-500`, daysText: null };
  if (days < 0) return { label: "เกินกำหนด", className: `${base} bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200`, daysText: `ผ่านมาแล้ว ${Math.abs(days)} วัน` };
  if (days <= 7) return { label: "ด่วนมาก", className: `${base} bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200`, daysText: `เหลืออีก ${days} วัน` };
  if (days <= 30) return { label: "ใกล้หมดอายุ", className: `${base} bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200`, daysText: `เหลืออีก ${days} วัน` };
  return { label: "ปกติ", className: `${base} bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200`, daysText: `เหลืออีก ${days} วัน` };
}

function workPermitNumber(employee: EmployeeRow) {
  return employee.work_permit_number || employee.work_permit_no || "";
}

export default function WorkPermitRenewalClient({ employees }: { employees: EmployeeRow[] }) {
  const router = useRouter();

  const [activeEmployee, setActiveEmployee] = useState<EmployeeRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      if (!res.ok || !data?.ok) throw new Error(data?.error || "บันทึกการต่อใบอนุญาตทำงานไม่สำเร็จ");
      setSuccess("บันทึกการต่อใบอนุญาตทำงานสำเร็จ");
      setActiveEmployee(null);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "บันทึกการต่อใบอนุญาตทำงานไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-white px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">รายการที่ต้องดำเนินการ</h3>
        </div>
        {error && <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}
        {success && <div className="m-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{success}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="min-w-[200px] px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">ชื่อ-นามสกุล</th>
                <th className="min-w-[140px] px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">รหัสพนักงาน</th>
                <th className="min-w-[170px] px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">เลขใบอนุญาต</th>
                <th className="min-w-[130px] px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">วันหมดอายุ</th>
                <th className="min-w-[120px] px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">เวลาที่เหลือ</th>
                <th className="min-w-[130px] px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">สถานะ</th>
                <th className="min-w-[120px] px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">ไฟล์</th>
                <th className="min-w-[170px] px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const status = statusFor(employee.work_permit_expiry_date);
                const number = workPermitNumber(employee);
                const expiryDate = formatThaiDate(employee.work_permit_expiry_date);
                return (
                  <tr key={employee.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-4 align-middle text-sm text-slate-700">
                      <div className="min-w-[180px]">
                        <p className="font-bold text-slate-900">{employee.employeeName || "ไม่ระบุชื่อ"}</p>
                        <p className="mt-0.5 text-xs text-slate-400">Profile #{employee.id}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle text-sm text-slate-700">
                      {employee.emp_code ? (
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-600 whitespace-nowrap">
                          {employee.emp_code}
                        </span>
                      ) : missing}
                    </td>
                    <td className="px-5 py-4 align-middle font-mono text-sm text-slate-600">{number || missing}</td>
                    <td className="px-5 py-4 align-middle font-mono text-sm text-slate-600 whitespace-nowrap">{expiryDate || missing}</td>
                    <td className="px-5 py-4 align-middle text-sm font-bold text-slate-700 whitespace-nowrap">{status.daysText || missing}</td>
                    <td className="px-5 py-4 text-center align-middle">
                      <span className={status.className}>{status.label}</span>
                    </td>
                    <td className="px-5 py-4 text-center align-middle">
                      {employee.has_work_permit_file ? (
                        <SecureDocumentButton
                          employeeId={employee.id}
                          documentType="work_permit"
                          className="inline-flex min-w-[92px] items-center justify-center rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-100 transition hover:bg-blue-100"
                        >
                          เปิดดูไฟล์
                        </SecureDocumentButton>
                      ) : (
                        <span className="inline-flex min-w-[92px] items-center justify-center whitespace-nowrap rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400">
                          ยังไม่มีไฟล์
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setSuccess("");
                          setActiveEmployee(employee);
                        }}
                        className="inline-flex min-w-[148px] items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ต่อใบอนุญาตทำงาน
                      </button>
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={8} className="border-t border-slate-100">
                    <div className="py-16 text-center">
                      <p className="text-sm font-semibold text-slate-500">ไม่มีรายการพนักงาน</p>
                      <p className="mt-1 text-xs text-slate-400">ยังไม่มีข้อมูลสำหรับดำเนินการต่อใบอนุญาตทำงาน</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-label="ต่อใบอนุญาตทำงาน"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6"
            onSubmit={(event) => {
              event.preventDefault();
              submit(new FormData(event.currentTarget));
            }}
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Work Permit Renewal</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">บันทึกการต่อใบอนุญาตทำงาน</h2>
              </div>
              {activeEmployee.has_work_permit_file && (
                <SecureDocumentButton
                  employeeId={activeEmployee.id}
                  documentType="work_permit"
                  className="inline-flex min-w-[92px] items-center justify-center rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-100 transition hover:bg-blue-100"
                >
                  ดูไฟล์เดิม
                </SecureDocumentButton>
              )}
            </div>

            <div className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
              <p><span className="font-bold text-slate-800">พนักงาน:</span> {activeEmployee.employeeName}</p>
              <p><span className="font-bold text-slate-800">รหัส:</span> {activeEmployee.emp_code || "-"}</p>
              <p><span className="font-bold text-slate-800">เลขเดิม:</span> {workPermitNumber(activeEmployee) || "-"}</p>
              <p><span className="font-bold text-slate-800">วันเดิม:</span> {formatThaiDate(activeEmployee.work_permit_expiry_date) || "-"}</p>
              <p><span className="font-bold text-slate-800">สถานะเดิม:</span> {statusFor(activeEmployee.work_permit_expiry_date).label}</p>
            </div>

            <input type="hidden" name="employeeId" value={activeEmployee.id} />
            <input type="hidden" name="documentType" value="work_permit" />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-slate-700">เลขใบอนุญาตใหม่</span>
                <input name="documentNumber" defaultValue={workPermitNumber(activeEmployee)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-slate-700">วันหมดอายุใหม่</span>
                <input type="date" name="expiryDate" required defaultValue={toInputDate(activeEmployee.work_permit_expiry_date)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">ไฟล์ Work Permit ใหม่</span>
              <input type="file" name="work_permit_document" accept=".pdf,.png,.jpg,.jpeg,.webp" className="h-11 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">หมายเหตุ</span>
              <textarea name="note" className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </label>

            <div className="mt-6 flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
              <button type="button" disabled={submitting} onClick={() => setActiveEmployee(null)} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50">
                ยกเลิก
              </button>
              <button type="submit" disabled={submitting} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
                {submitting ? "กำลังบันทึก..." : "บันทึกการต่อใบอนุญาตทำงาน"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
