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
import { buildDocumentExpiryAlerts } from "@/lib/document-alerts";
import { safeFileNameFrom } from "@/lib/docDebug";

interface PageProps {
  searchParams: Promise<{
    viewId?: string;
    docId?: string;
  }>;
}

function documentHref(documentFileName: string) {
  if (/^https?:\/\//i.test(documentFileName) || documentFileName.startsWith("/")) {
    return documentFileName;
  }
  return `/api/documents/${encodeURIComponent(documentFileName)}`;
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
  documentType: "passport" | "visa" | "work_permit" | "ninety_day";
  label: string;
  description: string;
}) {
  const hasFile = hasEmployeeDocumentFile(emp, documentType);

  return (
    <div className="p-4 border border-gray-200 rounded-2xl flex justify-between items-center bg-white shadow-sm">
      <div>
        <p className="font-bold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      {hasFile ? (
        <SecureDocumentButton employeeId={emp.id} documentType={documentType} className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">
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

    employees = await prisma.employee_document_profiles.findMany({
      where: { company_id: searchCompanyId },
      orderBy: { created_at: "desc" },
    });
  }

  const companyNameText = company?.company_name || dbUser?.full_name || "";
  const companyMap = new Map(company ? [[company.id, company.company_name]] : []);
  const documentExpiryAlerts = buildDocumentExpiryAlerts(employees, companyMap);

  const resolvedSearchParams = await searchParams;
  const viewId = resolvedSearchParams?.viewId;
  const docId = resolvedSearchParams?.docId;

  const viewEmployee = viewId ? employees.find((emp) => emp.id.toString() === viewId) : null;
  const activeDocEmp = docId ? employees.find((emp) => emp.id.toString() === docId) : null;
  const activeDocMainFileName = activeDocEmp ? safeLegacyFileName(activeDocEmp.document_file_name) : "";

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto font-sans text-gray-800 bg-[#f4f7fe] min-h-screen relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#111c44]">จัดการข้อมูลพนักงาน</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            บริษัท: {companyNameText || "ไม่พบข้อมูลบริษัท"} · แสดงเฉพาะข้อมูลพนักงานในบริษัทของคุณ
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3 w-full md:w-auto">
          <SpxRegistrationSection companyName={companyNameText} companyId={searchCompanyId || 0} />
        </div>
      </div>

      <DocumentExpiryNotificationSection
        summary={documentExpiryAlerts.summary}
        items={documentExpiryAlerts.items}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1100px]">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 border-b border-gray-100 uppercase tracking-wider text-[11px] md:text-xs">
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
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4 pl-6 font-bold text-[#0f2b6f] text-[13px]">{emp.emp_code || "-"}</td>
                  <td className="p-4">
                    <p className="font-bold text-gray-800 text-[13px]">
                      {emp.first_name_th || "-"} {emp.last_name_th || ""}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">
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
                    <Link href={`?viewId=${emp.id}`} scroll={false} className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="รายละเอียด">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-600 border border-orange-200 shadow-sm whitespace-nowrap">
                      รอต่อเอกสาร
                    </span>
                  </td>
                  <td className="p-4 text-center pr-6">
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`?docId=${emp.id}`} scroll={false} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-white text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white transition-all shadow-sm">
                        ดูเอกสาร
                      </Link>
                      <Link href={`/company-dashboard/employees/edit/${emp.id}`} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-white text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                        แก้ไข
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-400 font-medium bg-gray-50/50">
                    ไม่พบข้อมูลพนักงานในระบบสำหรับบริษัทนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-gray-800">ข้อมูลพนักงาน</h2>
              <Link href="/company-dashboard" className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-gray-50 hover:bg-red-50 rounded-lg">x</Link>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-1">รหัส</p>
                  <p className="font-bold text-lg text-blue-700">{viewEmployee.emp_code || "-"}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-1">สิทธิรักษาสุขภาพ</p>
                  <p className="font-bold text-sm text-gray-800">{viewEmployee.healthcare_rights || "ไม่ได้ระบุ"}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-1">ประเภทเวิร์ค</p>
                  <p className="font-bold text-sm text-gray-800 bg-white px-3 py-1 rounded-lg border border-gray-200 inline-block mt-1">
                    {getWorkTypeName(viewEmployee.work_type_id)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/30 p-6 rounded-2xl border border-blue-100">
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1">ชื่อ-นามสกุล (TH)</p>
                  <p className="font-bold text-lg text-gray-800">{viewEmployee.first_name_th || "-"} {viewEmployee.last_name_th || ""}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1">ชื่อ-นามสกุล (EN)</p>
                  <p className="font-bold text-lg text-gray-800 uppercase">{viewEmployee.first_name_en || "-"} {viewEmployee.last_name_en || ""}</p>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-6">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> วันหมดอายุเอกสาร (Expiration Dates)
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                    <p className="text-[11px] font-bold text-orange-600 mb-1 uppercase tracking-wide">Passport</p>
                    <p className="font-bold text-sm text-gray-800">{formatThaiDate(viewEmployee.passport_expiry_date)}</p>
                  </div>
                  <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                    <p className="text-[11px] font-bold text-purple-600 mb-1 uppercase tracking-wide">Visa</p>
                    <p className="font-bold text-sm text-gray-800">{formatThaiDate(viewEmployee.visa_expiry_date)}</p>
                  </div>
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                    <p className="text-[11px] font-bold text-emerald-600 mb-1 uppercase tracking-wide">Work Permit</p>
                    <p className="font-bold text-sm text-gray-800">{formatThaiDate(viewEmployee.work_permit_expiry_date)}</p>
                  </div>
                  <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100">
                    <p className="text-[11px] font-bold text-pink-600 mb-1 uppercase tracking-wide">90 Days</p>
                    <p className="font-bold text-sm text-gray-800">{formatThaiDate(viewEmployee.ninety_day_report_date || viewEmployee.report_90_days_date)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Link href="/company-dashboard" className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 shadow-sm transition-colors">
                ปิดหน้าต่าง
              </Link>
            </div>
          </div>
        </div>
      )}

      {activeDocEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-purple-50">
              <h2 className="text-lg font-bold text-purple-800">เอกสารแนบของ {activeDocEmp.first_name_th || activeDocEmp.emp_code}</h2>
              <Link href="/company-dashboard" className="text-gray-400 hover:text-red-500 transition-colors">x</Link>
            </div>
            <div className="p-6">
              {activeDocMainFileName && hasLegacyMainDocument(activeDocMainFileName) ? (
                <div className="p-4 border border-gray-200 rounded-2xl flex justify-between items-center bg-white shadow-sm mb-4">
                  <div>
                    <p className="font-bold text-gray-800">Main Document</p>
                    <p className="text-xs text-gray-500 mt-1">{activeDocMainFileName}</p>
                  </div>
                  <a href={documentHref(activeDocMainFileName)} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">
                    เปิดดูไฟล์
                  </a>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DocumentOpenControl emp={activeDocEmp} documentType="passport" label="Passport (PP)" description="หนังสือเดินทาง" />
                <DocumentOpenControl emp={activeDocEmp} documentType="visa" label="Visa (VS)" description="วีซ่า" />
                <DocumentOpenControl emp={activeDocEmp} documentType="work_permit" label="Work Permit" description="ใบอนุญาตทำงาน" />
                <DocumentOpenControl emp={activeDocEmp} documentType="ninety_day" label="90 Days (90D)" description="รายงานตัว 90 วัน" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Link href="/company-dashboard" className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 shadow-sm transition-colors">
                ปิดหน้าต่าง
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
