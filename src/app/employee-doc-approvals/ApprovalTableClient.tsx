"use client";

import { useEffect, useMemo, useState } from "react";
import SecureDocumentButton from "@/components/SecureDocumentButton";

type ApprovalItem = {
  id: number;
  requestNumber: string;
  employeeId: number | null;
  empCode: string;
  employeeName: string;
  companyName: string;
  documentType: string;
  status: "pending" | "approved" | "rejected" | string;
  requestedAt: string;
  remark: string | null;
  oldDocumentNumber: string | null;
  newDocumentNumber: string | null;
  oldExpiryDate: string | null;
  newExpiryDate: string | null;
  hasFile: boolean;
  hasStagedFile: boolean;
  fileStatus: "available" | "missing";
  viewUrl: string | null;
};

type Summary = {
  all: number;
  pending: number;
  approvedThisMonth: number;
  rejected: number;
};

const DOC_LABELS: Record<string, string> = {
  passport: "Passport",
  visa: "Visa",
  work_permit: "Work Permit",
  ninety_day: "90 Days",
};

const approvalStatusLabels: Record<string, string> = {
  pending: "รอตรวจสอบ",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธ",
};

function statusLabel(status: string) {
  return approvalStatusLabels[status] ?? status;
}

function statusClass(status: string) {
  if (status === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "rejected") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default function ApprovalTableClient() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ all: 0, pending: 0, approvedThisMonth: 0, rejected: 0 });
  const [activeStatus, setActiveStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [approveTarget, setApproveTarget] = useState<ApprovalItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reviseTarget, setReviseTarget] = useState<ApprovalItem | null>(null);
  const [reviseStatus, setReviseStatus] = useState("pending");
  const [reviseReason, setReviseReason] = useState("");
  const hasOpenModal = Boolean(approveTarget || rejectTarget || reviseTarget);

  useEffect(() => {
    if (!hasOpenModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || submittingId !== null) return;
      setApproveTarget(null);
      setRejectTarget(null);
      setReviseTarget(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [hasOpenModal, submittingId]);

  async function loadData() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (activeStatus !== "all") params.set("status", activeStatus);
    if (search.trim()) params.set("search", search.trim());

    try {
      const res = await fetch(`/api/document-approvals?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "โหลดข้อมูลไม่สำเร็จ");
      setItems(data.items || []);
      setSummary(data.summary || { all: 0, pending: 0, approvedThisMonth: 0, rejected: 0 });
    } catch (err: any) {
      setError(err?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(loadData, 250);
    return () => window.clearTimeout(timer);
  }, [activeStatus, search]);

  async function approve(item: ApprovalItem) {
    setSubmittingId(item.id);
    setError("");
    try {
      const res = await fetch(`/api/document-approvals/${item.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "อนุมัติไม่สำเร็จ");
      setApproveTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "อนุมัติไม่สำเร็จ");
    } finally {
      setSubmittingId(null);
    }
  }

  async function reject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    setSubmittingId(rejectTarget.id);
    setError("");
    try {
      const res = await fetch(`/api/document-approvals/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "ปฏิเสธไม่สำเร็จ");
      setRejectTarget(null);
      setRejectReason("");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "ปฏิเสธไม่สำเร็จ");
    } finally {
      setSubmittingId(null);
    }
  }

  async function revise() {
    if (!reviseTarget || !reviseReason.trim()) return;
    setSubmittingId(reviseTarget.id);
    setError("");
    try {
      const res = await fetch(`/api/document-approvals/${reviseTarget.id}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStatus: reviseStatus, reason: reviseReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "แก้ไขผลไม่สำเร็จ");
      setReviseTarget(null);
      setReviseReason("");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "แก้ไขผลไม่สำเร็จ");
    } finally {
      setSubmittingId(null);
    }
  }

  function openRevise(item: ApprovalItem) {
    setReviseTarget(item);
    setReviseStatus(item.status === "approved" ? "rejected" : "pending");
    setReviseReason("");
  }

  const tabs = useMemo(() => [
    { key: "all", label: `คำขอทั้งหมด (${summary.all})` },
    { key: "pending", label: `รอตรวจสอบ (${summary.pending})` },
    { key: "approved", label: "อนุมัติแล้ว" },
    { key: "rejected", label: `ถูกปฏิเสธ (${summary.rejected})` },
  ], [summary]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-gray-400 font-bold text-xs block mb-1">คำขอรอตรวจสอบ</span>
          <span className="text-2xl font-black text-amber-500">{summary.pending}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-gray-400 font-bold text-xs block mb-1">อนุมัติแล้วเดือนนี้</span>
          <span className="text-2xl font-black text-emerald-600">{summary.approvedThisMonth}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-gray-400 font-bold text-xs block mb-1">ปฏิเสธคำขอ</span>
          <span className="text-2xl font-black text-rose-600">{summary.rejected}</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col items-stretch justify-between gap-4 border-b border-gray-50 bg-gray-50/30 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex w-full gap-4 overflow-x-auto text-xs font-bold text-gray-400 sm:w-auto md:text-sm">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveStatus(tab.key)}
                className={`min-h-10 shrink-0 whitespace-nowrap pb-2 transition-colors ${activeStatus === tab.key ? "text-blue-600 border-b-2 border-blue-600" : "hover:text-gray-700"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาเลขคำขอ, รหัสพนักงาน, ชื่อ, บริษัท..."
            className="w-full sm:w-80 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>

        {error && <div className="m-4 break-words rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 sm:m-5">{error}</div>}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1120px]">
            <thead>
              <tr className="bg-slate-50/80 text-gray-500 border-b border-gray-100 uppercase tracking-wider text-[11px] md:text-xs font-bold">
                <th className="p-4 pl-6">เลขที่คำขอ</th>
                <th className="p-4">พนักงาน</th>
                <th className="p-4">บริษัท</th>
                <th className="p-4">ประเภทเอกสาร</th>
                <th className="p-4">ข้อมูลที่ขอเปลี่ยน</th>
                <th className="p-4 text-center">สถานะ</th>
                <th className="p-4">วันที่ยื่นเรื่อง</th>
                <th className="p-4 text-center">ไฟล์</th>
                <th className="min-w-[190px] p-4 text-center pr-6">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs md:text-sm font-medium text-gray-700">
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-gray-400">กำลังโหลดข้อมูล...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-gray-400">ไม่มีข้อมูลคำขอรออนุมัติ</td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4 pl-6 font-bold text-blue-700">{item.requestNumber}</td>
                  <td className="p-4">
                    <div className="font-bold text-gray-800">{item.employeeName}</div>
                    <div className="text-xs text-gray-400">{item.empCode}</div>
                  </td>
                  <td className="p-4 text-gray-600 max-w-[220px] truncate" title={item.companyName}>{item.companyName}</td>
                  <td className="p-4 font-bold text-gray-700">{DOC_LABELS[item.documentType] || item.documentType}</td>
                  <td className="p-4 text-xs text-gray-500">
                    <div>เลข: <span className="text-gray-400">{item.oldDocumentNumber || "-"}</span> -&gt; <span className="font-bold text-gray-800">{item.newDocumentNumber || "-"}</span></div>
                    <div>วัน: <span className="text-gray-400">{item.oldExpiryDate || "-"}</span> -&gt; <span className="font-bold text-gray-800">{item.newExpiryDate || "-"}</span></div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-3 py-1 rounded-lg border text-xs font-bold ${statusClass(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">{formatDate(item.requestedAt)}</td>
                  <td className="p-4 text-center">
                    {item.hasStagedFile && item.viewUrl ? (
                      <SecureDocumentButton viewUrl={item.viewUrl} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors">
                        ไฟล์ใหม่
                      </SecureDocumentButton>
                    ) : item.hasFile && item.employeeId && DOC_LABELS[item.documentType] ? (
                      <SecureDocumentButton employeeId={item.employeeId} documentType={item.documentType as any} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors">
                        ไฟล์เดิม
                      </SecureDocumentButton>
                    ) : item.hasFile && item.viewUrl ? (
                      <SecureDocumentButton viewUrl={item.viewUrl} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors">
                        เปิดดูไฟล์
                      </SecureDocumentButton>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-400 text-xs font-bold">ยังไม่มีไฟล์</span>
                    )}
                  </td>
                  <td className="min-w-[190px] px-4 py-4 text-center align-middle pr-6">
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                    {item.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setApproveTarget(item)}
                          title={item.hasFile ? "อนุมัติคำขอ" : "อนุมัติคำขอที่ไม่มีไฟล์แนบ"}
                          disabled={submittingId === item.id}
                          className="inline-flex min-w-[72px] items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {submittingId === item.id ? "กำลังดำเนินการ..." : "อนุมัติ"}
                        </button>
                        <button
                          type="button"
                          disabled={submittingId === item.id}
                          onClick={() => setRejectTarget(item)}
                          className="inline-flex min-w-[72px] items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {submittingId === item.id ? "กำลังดำเนินการ..." : "ปฏิเสธ"}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={submittingId === item.id}
                        onClick={() => openRevise(item)}
                        className="inline-flex min-w-[92px] items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 shadow-sm transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submittingId === item.id ? "กำลังดำเนินการ..." : "แก้ไขผล"}
                      </button>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="ยืนยันการปฏิเสธ" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <h2 className="text-lg font-black text-gray-900 mb-2">ปฏิเสธคำขอ</h2>
            <p className="text-sm text-gray-500 mb-4">
              {rejectTarget.employeeName} - {DOC_LABELS[rejectTarget.documentType] || rejectTarget.documentType}
            </p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              className="w-full min-h-28 rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              placeholder="ระบุเหตุผลที่ปฏิเสธ"
            />
            <div className="mt-5 flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={() => setRejectTarget(null)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || submittingId === rejectTarget.id}
                onClick={reject}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold disabled:opacity-50"
              >
                ยืนยันปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      {approveTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="ยืนยันการอนุมัติ" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <h2 className="text-lg font-black text-gray-900 mb-2">ยืนยันอนุมัติเอกสาร</h2>
            <p className="text-sm text-gray-500">
              {approveTarget.employeeName} - {DOC_LABELS[approveTarget.documentType] || approveTarget.documentType}
            </p>
            <p className="text-xs text-gray-400 mt-2">{approveTarget.requestNumber}</p>
            <div className="mt-5 flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={() => setApproveTarget(null)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submittingId === approveTarget.id}
                onClick={() => approve(approveTarget)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
              >
                ยืนยันอนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {reviseTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="แก้ไขผลการอนุมัติ" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <h2 className="text-lg font-black text-gray-900 mb-2">แก้ไขผลการอนุมัติ</h2>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p><span className="font-bold text-gray-800">คำขอ:</span> {reviseTarget.requestNumber}</p>
              <p><span className="font-bold text-gray-800">พนักงาน:</span> {reviseTarget.employeeName} ({reviseTarget.empCode})</p>
              <p><span className="font-bold text-gray-800">บริษัท:</span> {reviseTarget.companyName}</p>
              <p><span className="font-bold text-gray-800">เอกสาร:</span> {DOC_LABELS[reviseTarget.documentType] || reviseTarget.documentType}</p>
              <p><span className="font-bold text-gray-800">สถานะปัจจุบัน:</span> {statusLabel(reviseTarget.status)}</p>
              <p><span className="font-bold text-gray-800">ค่าเดิม:</span> {reviseTarget.oldDocumentNumber || "-"} / {reviseTarget.oldExpiryDate || "-"}</p>
              <p><span className="font-bold text-gray-800">ค่าที่ขอ:</span> {reviseTarget.newDocumentNumber || "-"} / {reviseTarget.newExpiryDate || "-"}</p>
              <p><span className="font-bold text-gray-800">เหตุผลเดิม:</span> {reviseTarget.remark || "-"}</p>
            </div>
            <label className="block text-xs font-bold text-gray-500 mb-1">สถานะใหม่</label>
            <select
              value={reviseStatus}
              onChange={(event) => setReviseStatus(event.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="approved">อนุมัติ</option>
              <option value="rejected">ปฏิเสธ</option>
              <option value="pending">ส่งกลับไปรอตรวจสอบ</option>
            </select>
            <label className="block text-xs font-bold text-gray-500 mb-1">เหตุผลในการแก้ไขผล</label>
            <textarea
              value={reviseReason}
              onChange={(event) => setReviseReason(event.target.value)}
              className="w-full min-h-28 rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="ระบุเหตุผลทุกครั้ง"
            />
            <div className="mt-5 flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={() => setReviseTarget(null)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!reviseReason.trim() || reviseStatus === reviseTarget.status || submittingId === reviseTarget.id}
                onClick={revise}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-bold disabled:opacity-50"
              >
                ยืนยันการแก้ไขผล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
