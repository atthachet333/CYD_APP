// src/app/company-dashboard/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import SpxRegistrationSection from "./SpxRegistrationSection";
import Link from "next/link";
import SecureDocumentButton from "@/components/SecureDocumentButton";
import DocumentExpiryNotificationSection from "@/components/DocumentExpiryNotificationSection";
import RouteModalEffects from "@/components/RouteModalEffects";
import { buildDocumentExpiryAlerts } from "@/lib/document-alerts";
import { safeFileNameFrom } from "@/lib/docDebug";

interface PageProps {
  searchParams: Promise<{
    viewId?: string;
    docId?: string;
    q?: string;
    alertPage?: string;
    docFilter?: string;
  }>;
}

function documentHref(documentFileName: string) {
  const filename = documentFileName.split(/[\\/]/).pop() || "";
  return filename ? `/api/documents/${encodeURIComponent(filename)}` : "";
}

function formatThaiDate(dateValue: Date | string | null | undefined) {
  if (!dateValue) return "ไม่ได้ระบุ";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "ไม่ได้ระบุ";
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getWorkTypeName(id: number | null) {
  if (id === 1) return "MOU";
  if (id === 2) return "มติ ครม. 11 พ.ย. 68";
  if (id === 3) return "มติ ครม. 2 ธ.ค. 68";
  if (id === 4) return "มติ ครม. 24 ก.ย. 67";
  return "ไม่ระบุ";
}

function buildApprovalStatusMap(rows: any[]) {
  const map = new Map<number, { pending: number; total: number }>();

  for (const row of rows) {
    if (!row.profile_id) continue;
    const current = map.get(row.profile_id) || { pending: 0, total: 0 };
    const count = row._count?._all || 0;
    current.total += count;
    if (String(row.status || "").toLowerCase() === "pending") current.pending += count;
    map.set(row.profile_id, current);
  }

  return map;
}

function approvalStatusBadge(empId: number, approvalStatusMap: Map<number, { pending: number; total: number }>) {
  const summary = approvalStatusMap.get(empId);
  if (summary?.pending) {
    return { text: "รออนุมัติเอกสาร", className: "bg-orange-50 text-orange-600 border border-orange-200" };
  }
  if (summary?.total) {
    return { text: "ตรวจเอกสารแล้ว", className: "bg-green-50 text-green-600 border border-green-200" };
  }
  return { text: "รอต่อเอกสาร", className: "bg-orange-50 text-orange-600 border border-orange-200" };
}

const DOCUMENTS_ROOT = path.join(process.cwd(), "private_uploads", "employee_documents");
const DOCUMENT_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

function hasEmployeeDocumentFile(emp: any, documentType: string) {
  const folderName = safeFileNameFrom(emp.emp_code || `employee-${emp.id}`);
  return DOCUMENT_EXTENSIONS.some((ext) =>
    fs.existsSync(path.join(DOCUMENTS_ROOT, folderName, `${documentType}${ext}`))
  );
}

function safeLegacyFileName(fileName: unknown) {
  const value = String(fileName || "").trim();
  if (!value || value.includes("..") || value.includes("/") || value.includes("\\") || path.basename(value) !== value) {
    return "";
  }
  return value;
}

function hasLegacyMainDocument(fileName: unknown) {
  const safeName = safeLegacyFileName(fileName);
  return Boolean(safeName && fs.existsSync(path.join(process.cwd(), "private_uploads", safeName)));
}

function DocumentBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`px-2 py-1 rounded text-[10px] font-bold border shadow-sm ${active ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-500 border-red-200"}`}>
      {label}
    </span>
  );
}

function DocumentOpenControl({
  emp,
  documentType,
  label,
  description,
}: {
  emp: any;
  documentType: "passport" | "visa" | "work_permit" | "ninety_day" | "main_document" | "profile_picture";
  label: string;
  description: string;
}) {
  const hasFile = hasEmployeeDocumentFile(emp, documentType);

  return (
    <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center transition-all hover:border-blue-200 hover:shadow-md">
      <div className="min-w-0">
        <p className="font-bold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      {hasFile ? (
        <SecureDocumentButton employeeId={emp.id} documentType={documentType as any} className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">
          เปิดดูไฟล์
        </SecureDocumentButton>
      ) : (
        <span className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-[11px] font-bold">
          ยังไม่มีไฟล์
        </span>
      )}
    </div>
  );
}

export default async function CompanyDashboardPage({ searchParams }: PageProps) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const resolvedSearchParams = await searchParams;
  const viewId = resolvedSearchParams?.viewId;
  const docId = resolvedSearchParams?.docId;
  const searchQuery = resolvedSearchParams?.q || "";
  const alertPage = Number(resolvedSearchParams?.alertPage) || 1;
  const alertPageSize = 10;
  const docFilter = resolvedSearchParams?.docFilter || "all";

  const sessionUsername = (session.user as any)?.username || "NO_MATCH_USER";
  const sessionEmail = session.user?.email || "NO_MATCH_EMAIL";
  const sessionName = session.user?.name || "NO_MATCH_NAME";

  const dbUser = (await prisma.users.findFirst({
    where: {
      OR: [
        { username: sessionUsername },
        { email: sessionEmail },
        { full_name: sessionName },
      ],
    },
  })) as any;

  const userCompanyId = dbUser?.company_id || (session.user as any)?.companyId || null;
  const searchCompanyId = userCompanyId ? Number(userCompanyId) : null;

  let company: any = null;
  let employees: any[] = [];

  if (searchCompanyId && !Number.isNaN(searchCompanyId)) {
    company = await prisma.companies.findUnique({
      where: { id: searchCompanyId },
    });

    const employeeFilter: any = { company_id: searchCompanyId };
    if (searchQuery) {
      employeeFilter.OR = [
        { emp_code: { contains: searchQuery } },
        { first_name_th: { contains: searchQuery } },
        { last_name_th: { contains: searchQuery } },
        { first_name_en: { contains: searchQuery } },
        { last_name_en: { contains: searchQuery } },
      ];
    }

    employees = await prisma.employee_document_profiles.findMany({
      where: employeeFilter,
      orderBy: { created_at: "desc" },
    });
  }

  const employeeIds = employees.map((emp) => emp.id);
  const approvalStatusRows = employeeIds.length
    ? await prisma.employee_document_approvals.groupBy({
        by: ["profile_id", "status"],
        where: { profile_id: { in: employeeIds } },
        _count: { _all: true },
      })
    : [];
  const approvalStatusMap = buildApprovalStatusMap(approvalStatusRows);

  const companyNameText = company?.company_name || dbUser?.full_name || "";
  const companyMap = new Map(company ? [[company.id, company.company_name]] : []);
  
  const documentExpiryAlerts = buildDocumentExpiryAlerts(employees, companyMap);
  const rawAlertItems = documentExpiryAlerts?.items || [];
  let allAlerts = Array.isArray(rawAlertItems) ? rawAlertItems : [];

  if (docFilter && docFilter !== "all") {
    allAlerts = allAlerts.filter((a: any) => {
      const str = JSON.stringify(a).toLowerCase();
      if (docFilter === "passport") return str.includes("passport") || str.includes("พาสปอร์ต");
      if (docFilter === "visa") return str.includes("visa") || str.includes("วีซ่า");
      if (docFilter === "workpermit") return str.includes("work permit") || str.includes("work_permit") || str.includes("ใบอนุญาตทำงาน");
      if (docFilter === "90d") return str.includes("90 day") || str.includes("90-day") || str.includes("90d") || str.includes("90 วัน");
      return true;
    });
  }
  
  const totalAlerts = allAlerts.length;
  const totalAlertPages = Math.ceil(totalAlerts / alertPageSize) || 1;
  const currentAlertPage = Math.min(Math.max(alertPage, 1), totalAlertPages);
  
  const paginatedAlerts = allAlerts.slice((currentAlertPage - 1) * alertPageSize, currentAlertPage * alertPageSize);

  const bottomTableEmployees = employees.slice(0, 20);

  const activeDocEmp = docId ? employees.find((emp) => emp.id.toString() === docId) : null;
  const viewEmployee = viewId ? employees.find((emp) => emp.id.toString() === viewId) : null;
  const activeDocMainFileName = activeDocEmp ? safeLegacyFileName(activeDocEmp.document_file_name) : "";

  const currentUrlQuery = `q=${encodeURIComponent(searchQuery)}&docFilter=${docFilter}&alertPage=${currentAlertPage}`;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto font-sans text-gray-800 bg-[#f4f7fe] min-h-screen relative pb-20">
      {(viewEmployee || activeDocEmp) && <RouteModalEffects closeHref={`/company-dashboard?${currentUrlQuery}`} />}
      
      <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-[1.5rem] border border-gray-100 bg-white p-6 shadow-sm xl:flex-row xl:items-center transition-all hover:shadow-md">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-extrabold text-[#111c44] tracking-tight">จัดการข้อมูลพนักงาน</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            บริษัท: <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{companyNameText || "ไม่พบข้อมูลบริษัท"}</span> · แสดงเฉพาะข้อมูลในบริษัทของคุณ
          </p>
        </div>
        
        <div className="mt-4 xl:mt-0 flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-center">
          <form action="/company-dashboard" method="GET" className="relative w-full sm:w-80 group">
            <input 
              type="text" 
              name="q" 
              defaultValue={searchQuery}
              placeholder="ค้นหารหัส, ชื่อ, นามสกุล..." 
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-gray-700"
            />
            <input type="hidden" name="docFilter" value={docFilter} />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <button type="submit" className="hidden">ค้นหา</button>
          </form>
          
          <SpxRegistrationSection companyName={companyNameText} companyId={searchCompanyId || 0} />
        </div>
      </div>

      {/* กล่องแจ้งเตือนเอกสารใกล้หมดอายุ */}
      <div className="mb-8 bg-white rounded-[1.5rem] shadow-sm border border-red-100 overflow-hidden transition-all hover:shadow-md">
        <div className="border-b border-red-50 bg-red-50/40 p-4 md:px-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            </div>
            <span className="font-bold text-red-900 tracking-tight">กรองประเภทเอกสาร:</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
             <Link href={`?q=${encodeURIComponent(searchQuery)}&docFilter=all`} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${docFilter === 'all' ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>ทั้งหมด</Link>
             <Link href={`?q=${encodeURIComponent(searchQuery)}&docFilter=passport`} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${docFilter === 'passport' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}>Passport</Link>
             <Link href={`?q=${encodeURIComponent(searchQuery)}&docFilter=visa`} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${docFilter === 'visa' ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/30' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}>Visa</Link>
             <Link href={`?q=${encodeURIComponent(searchQuery)}&docFilter=workpermit`} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${docFilter === 'workpermit' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/30' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}>Work Permit</Link>
             <Link href={`?q=${encodeURIComponent(searchQuery)}&docFilter=90d`} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${docFilter === '90d' ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-500/30' : 'bg-white text-pink-600 border-pink-200 hover:bg-pink-50'}`}>90 Days</Link>
          </div>
        </div>

        <DocumentExpiryNotificationSection
          summary={documentExpiryAlerts.summary}
          items={paginatedAlerts} 
        />
        
        {totalAlerts === 0 && docFilter !== 'all' && (
          <div className="p-10 text-center text-gray-400 font-medium bg-red-50/30 text-sm">
            ไม่มีเอกสารประเภทนี้ที่ใกล้หมดอายุ
          </div>
        )}

        {totalAlerts > 0 && (
          <div className="p-4 md:px-6 border-t border-red-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-700">
            <div className="font-medium bg-red-50 text-red-800 px-4 py-2 rounded-lg border border-red-100 shadow-inner text-xs md:text-sm">
              แสดง <span className="font-bold text-red-600">{(currentAlertPage - 1) * alertPageSize + 1}</span> ถึง <span className="font-bold text-red-600">{Math.min(currentAlertPage * alertPageSize, totalAlerts)}</span> จากทั้งหมด <span className="font-bold text-red-600">{totalAlerts}</span> แจ้งเตือน
            </div>
            
            <div className="flex items-center gap-2">
              <Link href={`?q=${encodeURIComponent(searchQuery)}&docFilter=${docFilter}&alertPage=${Math.max(1, currentAlertPage - 1)}`} className={`px-4 py-2 border border-gray-200 rounded-lg bg-white font-bold text-xs transition-all shadow-sm ${currentAlertPage <= 1 ? "opacity-50 pointer-events-none bg-gray-50 text-gray-400" : "hover:bg-red-50 hover:text-red-600 hover:border-red-200"}`}>
                &laquo; ก่อนหน้า
              </Link>
              <div className="px-5 py-2 font-extrabold text-red-700 bg-red-50/50 border border-red-100 rounded-lg shadow-sm text-xs">
                หน้า {currentAlertPage} / {totalAlertPages}
              </div>
              <Link href={`?q=${encodeURIComponent(searchQuery)}&docFilter=${docFilter}&alertPage=${Math.min(totalAlertPages, currentAlertPage + 1)}`} className={`px-4 py-2 border border-gray-200 rounded-lg bg-white font-bold text-xs transition-all shadow-sm ${currentAlertPage >= totalAlertPages ? "opacity-50 pointer-events-none bg-gray-50 text-gray-400" : "hover:bg-red-50 hover:text-red-600 hover:border-red-200"}`}>
                ถัดไป &raquo;
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Data Table Section */}
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            รายชื่อพนักงานล่าสุด <span className="text-sm font-medium text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-sm ml-2">(แสดง 20 รายการ)</span>
          </h2>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1100px]">
            <thead>
              <tr className="bg-white text-gray-500 border-b border-gray-100 uppercase tracking-wider text-[11px] md:text-xs">
                <th className="p-4 font-bold pl-6">รหัส</th>
                <th className="p-4 font-bold">ชื่อ-นามสกุล</th>
                <th className="p-4 font-bold text-center">ประเภทเวิร์ค</th>
                <th className="p-4 font-bold text-center">เอกสาร</th>
                <th className="p-4 font-bold text-center">ดูข้อมูล</th>
                <th className="p-4 font-bold text-center">สถานะ</th>
                <th className="p-4 font-bold text-center pr-6">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bottomTableEmployees.map((emp) => {
                const statusBadge = approvalStatusBadge(emp.id, approvalStatusMap);

                return (
                <tr key={emp.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="p-4 pl-6 font-extrabold text-[#0f2b6f] text-[13px]">{emp.emp_code || "-"}</td>
                  <td className="p-4">
                    <p className="font-bold text-gray-800 text-[13px]">
                      {emp.first_name_th || "-"} {emp.last_name_th || ""}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
                      {emp.first_name_en || "-"} {emp.last_name_en || ""}
                    </p>
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-blue-100">
                      {getWorkTypeName(emp.work_type_id)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <DocumentBadge active={Boolean(emp.passport_number || emp.passport_file)} label="PP" />
                      <DocumentBadge active={Boolean(emp.visa_number || emp.visa_file)} label="VISA" />
                      <DocumentBadge active={Boolean(emp.work_permit_number || emp.work_permit_file)} label="WP" />
                      <DocumentBadge active={Boolean(emp.ninety_day_number || emp.ninety_day_file)} label="90D" />
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <Link href={`?${currentUrlQuery}&viewId=${emp.id}`} scroll={false} className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-200" title="รายละเอียด">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold shadow-sm whitespace-nowrap ${statusBadge.className}`}>
                      {statusBadge.text}
                    </span>
                  </td>
                  <td className="p-4 text-center pr-6">
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`?${currentUrlQuery}&docId=${emp.id}`} scroll={false} className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-[11px] font-bold text-purple-600 shadow-sm transition-all hover:bg-purple-600 hover:text-white">
                        ดูเอกสาร
                      </Link>
                      <Link href={`/company-dashboard/employees/edit/${emp.id}`} className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 shadow-sm transition-all hover:bg-blue-600 hover:text-white">
                        แก้ไข
                      </Link>
                    </div>
                  </td>
                </tr>
              )})}
              {bottomTableEmployees.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-400 font-medium bg-gray-50/50">
                    {searchQuery ? `ไม่พบข้อมูลที่ตรงกับ "${searchQuery}"` : "ไม่พบข้อมูลพนักงานในระบบสำหรับบริษัทนี้"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP: ดูข้อมูลพนักงาน */}
      {viewEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-label="ข้อมูลพนักงาน" className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-extrabold text-[#111c44]">ข้อมูลพนักงาน</h2>
              <Link href={`/company-dashboard?${currentUrlQuery}`} scroll={false} className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-gray-50 hover:bg-red-50 rounded-xl">x</Link>
            </div>

            <div className="custom-scrollbar space-y-6 overflow-y-auto p-4 text-sm sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-1">รหัส</p>
                  <p className="font-extrabold text-lg text-blue-700">{viewEmployee.emp_code || "-"}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-1">สิทธิรักษาสุขภาพ</p>
                  <p className="font-bold text-sm text-gray-800">{viewEmployee.healthcare_rights || "ไม่ได้ระบุ"}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-1">ประเภทเวิร์ค</p>
                  <p className="font-bold text-sm text-gray-800 bg-white px-3 py-1 rounded-lg border border-gray-200 inline-block mt-1 shadow-sm">
                    {getWorkTypeName(viewEmployee.work_type_id)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/40 p-6 rounded-2xl border border-blue-100">
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1">ชื่อ-นามสกุล (TH)</p>
                  <p className="font-extrabold text-lg text-gray-800">{viewEmployee.first_name_th || "-"} {viewEmployee.last_name_th || ""}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1">ชื่อ-นามสกุล (EN)</p>
                  <p className="font-extrabold text-lg text-gray-800 uppercase">{viewEmployee.first_name_en || "-"} {viewEmployee.last_name_en || ""}</p>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-6">
                <h3 className="text-sm font-extrabold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" /> วันหมดอายุเอกสาร (Expiration Dates)
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 hover:shadow-md transition-all">
                    <p className="text-[11px] font-extrabold text-orange-600 mb-1 uppercase tracking-wider">Passport</p>
                    <p className="font-bold text-sm text-gray-800">{formatThaiDate(viewEmployee.passport_expiry_date)}</p>
                  </div>
                  <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 hover:shadow-md transition-all">
                    <p className="text-[11px] font-extrabold text-purple-600 mb-1 uppercase tracking-wider">Visa</p>
                    <p className="font-bold text-sm text-gray-800">{formatThaiDate(viewEmployee.visa_expiry_date)}</p>
                  </div>
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 hover:shadow-md transition-all">
                    <p className="text-[11px] font-extrabold text-emerald-600 mb-1 uppercase tracking-wider">Work Permit</p>
                    <p className="font-bold text-sm text-gray-800">{formatThaiDate(viewEmployee.work_permit_expiry_date)}</p>
                  </div>
                  <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 hover:shadow-md transition-all">
                    <p className="text-[11px] font-extrabold text-pink-600 mb-1 uppercase tracking-wider">90 Days</p>
                    <p className="font-bold text-sm text-gray-800">{formatThaiDate(viewEmployee.ninety_day_report_date || viewEmployee.report_90_days_date)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Link href={`/company-dashboard?${currentUrlQuery}`} scroll={false} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 shadow-sm transition-colors">
                ปิดหน้าต่าง
              </Link>
            </div>
          </div>
        </div>
      )}

{/* POPUP: ดูเอกสาร */}
      {activeDocEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-label="เอกสารแนบพนักงาน" className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-purple-50">
              <h2 className="text-lg font-extrabold text-purple-800 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                 เอกสารแนบของ <span className="text-[#111c44]">{activeDocEmp.first_name_th || activeDocEmp.emp_code}</span>
              </h2>
              <Link href={`/employees?${currentUrlQuery}`} scroll={false} className="text-gray-400 hover:text-red-500 transition-colors bg-white p-2 rounded-xl shadow-sm">x</Link>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6">
              {activeDocMainFileName && hasLegacyMainDocument(activeDocMainFileName) ? (
                <div className="mb-4 flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center hover:border-blue-200 transition-all">
                  <div>
                    <p className="font-bold text-gray-800">Main Document</p>
                    <p className="mt-1 break-all text-xs text-gray-500" title={activeDocMainFileName}>{activeDocMainFileName}</p>
                  </div>
                  <SecureDocumentButton viewUrl={documentHref(activeDocMainFileName)} className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">
                    เปิดดูไฟล์
                  </SecureDocumentButton>
                </div>
              ) : null}

              {/* 🟢 แสดงปุ่มเปิดดูไฟล์แนบแบบ 6 ป้ายชัดเจนสวยงาม */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DocumentOpenControl emp={activeDocEmp} documentType="main_document" label="1. ใบเก็บอัตลักษณ์" description="เอกสารเก็บอัตลักษณ์พนักงาน" />
                <DocumentOpenControl emp={activeDocEmp} documentType="profile_picture" label="2. รูปถ่ายพนักงาน" description="รูปถ่ายหน้าตรง" />
                <DocumentOpenControl emp={activeDocEmp} documentType="passport" label="3. หนังสือเดินทาง (Passport)" description="สำเนาพาสปอร์ต" />
                <DocumentOpenControl emp={activeDocEmp} documentType="visa" label="4. วีซ่า (Visa)" description="สำเนาวีซ่าประจำตัว" />
                <DocumentOpenControl emp={activeDocEmp} documentType="work_permit" label="5. ใบอนุญาตทำงาน (Work Permit)" description="สำเนา Work Permit" />
                <DocumentOpenControl emp={activeDocEmp} documentType="ninety_day" label="6. ใบรายงานตัว 90 วัน" description="รายงานตัว 90 วันล่าสุด" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Link href={`/employees?${currentUrlQuery}`} scroll={false} className="px-8 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 shadow-sm transition-colors">
                ปิดหน้าต่าง
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}