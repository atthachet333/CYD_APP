import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link"; 
import SecureDocumentButton from "@/components/SecureDocumentButton";
import DocumentExpiryNotificationSection from "@/components/DocumentExpiryNotificationSection";
import RouteModalEffects from "@/components/RouteModalEffects";
import { buildDocumentExpiryAlerts } from "@/lib/document-alerts";

function documentHref(documentFileName: string) {
  const filename = documentFileName.split(/[\\/]/).pop() || "";
  return filename ? `/api/documents/${encodeURIComponent(filename)}` : "";
}

function formatThaiDate(dateString: any) {
  if (!dateString) return "ไม่ได้ระบุ";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "ไม่ได้ระบุ"; 
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return "ไม่ได้ระบุ";
  }
}

interface PageProps {
  searchParams: Promise<{
    viewId?: string;
    docId?: string;
    moveId?: string;
    deleteId?: string;
    page?: string;
    docType?: string;
    search?: string;
  }>;
}

const getWorkTypeName = (id: number | null) => {
  if (id === 1) return "MOU";
  if (id === 2) return "มติ ครม. 11 พ.ย. 68";
  if (id === 3) return "มติ ครม. 2 ธ.ค. 68";
  return "ไม่ระบุ";
};

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

async function deleteEmployeeAction(formData: FormData) {
  "use server";
  const id = formData.get("id");
  if (id) {
    await prisma.employee_document_profiles.delete({
      where: { id: Number(id) },
    });
  }
  redirect("/employees");
}

async function moveEmployeeAction(formData: FormData) {
  "use server";
  const id = formData.get("id");
  const new_company_id = formData.get("new_company_id");
  if (id && new_company_id) {
    await prisma.employee_document_profiles.update({
      where: { id: Number(id) },
      data: { company_id: Number(new_company_id) },
    });
  }
  redirect("/employees");
}

export default async function EmployeesPage({ searchParams }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const viewId = resolvedSearchParams?.viewId;
  const docId = resolvedSearchParams?.docId;
  const moveId = resolvedSearchParams?.moveId;
  const deleteId = resolvedSearchParams?.deleteId;
  
  const search = resolvedSearchParams?.search || "";
  const docType = (resolvedSearchParams?.docType || "").toString().trim().toLowerCase();
  
  // ✅ กำหนดให้แสดงผลแค่ 10 รายการต่อหน้า
  const alertPage = Number(resolvedSearchParams?.page) || 1;
  const alertLimit = 10;

  const sessionUsername = (session.user as any)?.username || "NO_MATCH_USER";
  const sessionEmail = session.user?.email || "NO_MATCH_EMAIL";
  const sessionName = session.user?.name || "NO_MATCH_NAME";

  const dbUser = await prisma.users.findFirst({
    where: {
      OR: [
        { username: sessionUsername },
        { email: sessionEmail },
        { full_name: sessionName },
      ],
    },
    include: { roles: true },
  }) as any;

  const role = String(dbUser?.roles?.name || (session.user as any)?.role || "").toUpperCase();
  const userCompanyId = dbUser?.company_id || (session.user as any)?.companyId || null;

  if (role === "CUSTOMER") {
    redirect("/company-dashboard");
  }

  const canViewDocs = role !== "CUSTOMER";

  // ✅ การกรองข้อมูล Database หลักที่ปลอดภัย ไม่มี Error
  const filterConditions: any[] = [];

  if (role === "COMPANY_USER" && userCompanyId) {
    filterConditions.push({ company_id: Number(userCompanyId) });
  }

  if (search) {
    filterConditions.push({
      OR: [
        { emp_code: { contains: search } },
        { first_name_th: { contains: search } },
        { last_name_th: { contains: search } },
        { first_name_en: { contains: search } },
        { last_name_en: { contains: search } },
      ],
    });
  }

  if (docType === "passport") {
    filterConditions.push({ passport_number: { not: null } });
    filterConditions.push({ passport_number: { not: "" } });
    filterConditions.push({ passport_number: { not: "-" } });
  } else if (docType === "visa") {
    filterConditions.push({ visa_number: { not: null } });
    filterConditions.push({ visa_number: { not: "" } });
    filterConditions.push({ visa_number: { not: "-" } });
  } else if (docType === "work_permit") {
    filterConditions.push({ work_permit_number: { not: null } });
    filterConditions.push({ work_permit_number: { not: "" } });
    filterConditions.push({ work_permit_number: { not: "-" } });
  } else if (docType === "90days") {
    filterConditions.push({
      OR: [
        { ninety_day_report_date: { not: null } },
        { report_90_days_date: { not: null } }
      ]
    });
  }

  const employeeFilter = filterConditions.length > 0 ? { AND: filterConditions } : {};

  const companies = await prisma.companies.findMany({
    orderBy: { company_name: "asc" },
  });

  const companyMap = new Map(
    companies.map((company) => [company.id, company.company_name])
  );

  // ==========================================
  // 📌 1. จัดการข้อมูลแจ้งเตือนเอกสาร
  // ==========================================
  const allEmployeesForAlerts = await prisma.employee_document_profiles.findMany({
    where: employeeFilter,
  });
  
  const documentExpiryAlerts = buildDocumentExpiryAlerts(allEmployeesForAlerts, companyMap);
  
  // ✅ ดักกรองแจ้งเตือน (Alerts) ซ้ำอีกชั้น ให้เหลือเฉพาะเอกสารที่กด Filter มาเท่านั้น
  let filteredAlertItems = documentExpiryAlerts.items || [];
  
  if (docType === "passport") {
    filteredAlertItems = filteredAlertItems.filter((item: any) => {
      const text = Object.values(item).map(String).join(" ").toLowerCase();
      return text.includes("passport") || text.includes("pp") || text.includes("พาสปอร์ต");
    });
  } else if (docType === "visa") {
    filteredAlertItems = filteredAlertItems.filter((item: any) => {
      const text = Object.values(item).map(String).join(" ").toLowerCase();
      return text.includes("visa") || text.includes("วีซ่า");
    });
  } else if (docType === "work_permit") {
    filteredAlertItems = filteredAlertItems.filter((item: any) => {
      const text = Object.values(item).map(String).join(" ").toLowerCase();
      return text.includes("work") || text.includes("permit") || text.includes("ใบอนุญาต");
    });
  } else if (docType === "90days") {
    filteredAlertItems = filteredAlertItems.filter((item: any) => {
      const text = Object.values(item).map(String).join(" ").toLowerCase();
      return text.includes("90");
    });
  }

  const totalAlerts = filteredAlertItems.length;
  const totalAlertPages = Math.ceil(totalAlerts / alertLimit) || 1;
  const currentAlertPage = Math.min(Math.max(alertPage, 1), totalAlertPages);
  
  // ตัดข้อมูล Alerts เอาแค่ 10 ตัวตามหน้าที่เลือก
  const alertSkip = (currentAlertPage - 1) * alertLimit;
  const paginatedAlertItems = filteredAlertItems.slice(alertSkip, alertSkip + alertLimit);

  // ==========================================
  // 📌 2. จัดการตารางข้อมูลพนักงาน (ฟิกซ์โชว์ 10 รายการล่าสุด)
  // ==========================================
  const rawEmployees = await prisma.employee_document_profiles.findMany({
    where: employeeFilter,
    orderBy: { created_at: "desc" },
    take: 10,
  });

  const employeeIds = rawEmployees.map((emp) => emp.id);
  const approvalStatusRows = employeeIds.length
    ? await prisma.employee_document_approvals.groupBy({
        by: ["profile_id", "status"],
        where: { profile_id: { in: employeeIds } },
        _count: { _all: true },
      })
    : [];
  const approvalStatusMap = buildApprovalStatusMap(approvalStatusRows);

  const employees = Array.from(
    new Map(
      rawEmployees.map((emp) => [
        `${emp.emp_code || "no-code"}-${emp.first_name_th || "no-fname"}`,
        emp,
      ])
    ).values()
  );

  const viewEmployee = viewId ? allEmployeesForAlerts.find((e) => e.id.toString() === viewId) : null;
  const activeDocEmp = docId ? allEmployeesForAlerts.find((e) => e.id.toString() === docId) : null;
  const activeMoveEmp = moveId ? allEmployeesForAlerts.find((e) => e.id.toString() === moveId) : null;
  const activeDeleteEmp = deleteId ? allEmployeesForAlerts.find((e) => e.id.toString() === deleteId) : null;

  // ฟังก์ชันสร้าง URL เพื่อเก็บสถานะการกรองและการแบ่งหน้า Alerts
  const createUrlWithParams = (newParams: Record<string, string | number | null>, clearPopup = false) => {
    const params = new URLSearchParams();
    params.set("page", currentAlertPage.toString());
    if (search) params.set("search", search);
    if (docType) params.set("docType", docType); // เก็บค่าตัวกรองให้คงอยู่
    
    if (clearPopup) {
      params.delete("viewId");
      params.delete("docId");
      params.delete("moveId");
      params.delete("deleteId");
    }

    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null) params.delete(key);
      else params.set(key, val.toString());
    });
    return `/employees?${params.toString()}`;
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto font-sans text-gray-800 bg-[#f4f7fe] min-h-screen relative">
      {(viewEmployee || activeDocEmp || activeMoveEmp || activeDeleteEmp) && (
        <RouteModalEffects closeHref={createUrlWithParams({}, true)} />
      )}
      
      <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 md:flex-row md:items-center">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-extrabold text-[#111c44] sm:text-2xl">จัดการข้อมูลพนักงาน</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">ระบบลงทะเบียนและจัดการประวัติพนักงานต่างด้าว / คนไทย ในระบบทั้งหมด</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3 w-full md:w-auto">
          <Link href="/employees/create" className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/20 hover:bg-blue-700 transition flex items-center justify-center gap-2">
            + เพิ่มพนักงานใหม่
          </Link>
        </div>
      </div>

      <form method="GET" action="/employees" className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-3 items-end">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2">ค้นหาพนักงาน (ชื่อ / รหัส)</label>
          <input 
            type="text" 
            name="search" 
            defaultValue={search}
            placeholder="พิมพ์รหัส หรือ ชื่อพนักงาน..." 
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2">กรองตามคีย์เอกสารที่มี</label>
          <select 
            name="docType" 
            defaultValue={docType}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">-- แสดงทั้งหมด --</option>
            <option value="passport">Passport (PP)</option>
            <option value="visa">Visa (VISA)</option>
            <option value="work_permit">Work Permit (WP)</option>
            <option value="90days">90 Days Report (90D)</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-sm hover:bg-blue-700 transition">
            ค้นหาข้อมูล
          </button>
          <Link scroll={false} href="/employees" className="px-4 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-200 transition text-center flex items-center justify-center">
            ล้างตัวกรอง
          </Link>
        </div>
      </form>

      {/* ✅ กล่องแจ้งเตือน */}
      <DocumentExpiryNotificationSection
        summary={documentExpiryAlerts.summary}
        items={paginatedAlertItems}
      />

      {/* ✅ ออกแบบระบบแบ่งหน้าใหม่ (ปุ่มตัวเลข) และเพิ่ม scroll={false} ไม่ให้เด้งไปบนสุด */}
      {totalAlerts > alertLimit && (
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-orange-100 bg-orange-50/50 p-4 shadow-sm">
          <span className="text-sm font-medium text-orange-800">
            รายการแจ้งเตือน <span className="font-bold">{totalAlerts === 0 ? 0 : alertSkip + 1}</span> ถึง <span className="font-bold">{Math.min(alertSkip + alertLimit, totalAlerts)}</span> จากทั้งหมด <span className="font-bold">{totalAlerts}</span> รายการ
          </span>
          <div className="mt-4 flex items-center gap-1.5 sm:mt-0 flex-wrap justify-end">
            
            {/* ปุ่มกลับ */}
            {currentAlertPage > 1 ? (
              <Link scroll={false} href={createUrlWithParams({ page: currentAlertPage - 1 })} className="px-3 py-1.5 rounded-lg border border-orange-200 bg-white text-sm font-bold text-orange-600 hover:bg-orange-100 transition shadow-sm">
                &laquo; ก่อนหน้า
              </Link>
            ) : (
              <button disabled className="px-3 py-1.5 cursor-not-allowed rounded-lg border border-orange-100 bg-orange-50 text-sm font-bold text-orange-300">
                &laquo; ก่อนหน้า
              </button>
            )}

            {/* ปุ่มตัวเลขหน้า */}
            {Array.from({ length: totalAlertPages }).map((_, idx) => {
              const pageNum = idx + 1;
              // ลอจิกซ่อนหน้าถ้ามันเยอะเกินไป (แสดงแค่บางหน้าใกล้ๆ กัน)
              if (
                pageNum === 1 || 
                pageNum === totalAlertPages || 
                (pageNum >= currentAlertPage - 1 && pageNum <= currentAlertPage + 1)
              ) {
                return (
                  <Link 
                    key={pageNum}
                    scroll={false}
                    href={createUrlWithParams({ page: pageNum })} 
                    className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition shadow-sm ${currentAlertPage === pageNum ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-100'}`}
                  >
                    {pageNum}
                  </Link>
                );
              }
              // แสดงจุดไข่ปลา
              if (pageNum === currentAlertPage - 2 || pageNum === currentAlertPage + 2) {
                return <span key={pageNum} className="px-2 text-orange-400">...</span>;
              }
              return null;
            })}

            {/* ปุ่มถัดไป */}
            {currentAlertPage < totalAlertPages ? (
              <Link scroll={false} href={createUrlWithParams({ page: currentAlertPage + 1 })} className="px-3 py-1.5 rounded-lg border border-orange-200 bg-white text-sm font-bold text-orange-600 hover:bg-orange-100 transition shadow-sm">
                ถัดไป &raquo;
              </Link>
            ) : (
              <button disabled className="px-3 py-1.5 cursor-not-allowed rounded-lg border border-orange-100 bg-orange-50 text-sm font-bold text-orange-300">
                ถัดไป &raquo;
              </button>
            )}
          </div>
        </div>
      )}

      {/* ตารางข้อมูลพนักงาน 10 รายการล่าสุด */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#111c44] flex items-center gap-2">
          <span className="w-2 h-6 bg-blue-600 rounded-full inline-block"></span> 
          ข้อมูลพนักงาน 10 รายการล่าสุด
        </h2>
      </div>
      
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
              {employees.length === 0 ? (
                <tr>
                   <td colSpan={7} className="p-8 text-center text-gray-400">ไม่พบข้อมูลพนักงานที่ตรงตามเงื่อนไขการค้นหา</td>
                </tr>
              ) : employees.map((emp: any) => {
                const statusBadge = approvalStatusBadge(emp.id, approvalStatusMap);

                return (
                <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4 pl-6 font-bold text-[#0f2b6f] text-[13px]">{emp.emp_code || '-'}</td>
                  <td className="p-4">
                    <p className="font-bold text-gray-800 text-[13px]">{emp.first_name_th} {emp.last_name_th}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{emp.first_name_en} {emp.last_name_en}</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-blue-100">
                      {getWorkTypeName(emp.work_type_id)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border shadow-sm ${emp.passport_number ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>PP</span>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border shadow-sm ${emp.visa_number ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>VISA</span>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border shadow-sm ${emp.work_permit_number ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>WP</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <Link scroll={false} href={createUrlWithParams({ viewId: emp.id })} className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="รายละเอียด">
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
                      {canViewDocs ? (
                        <Link scroll={false} href={createUrlWithParams({ docId: emp.id })} className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-[11px] font-bold text-purple-600 shadow-sm transition-all hover:bg-purple-600 hover:text-white">ดูเอกสาร</Link>
                      ) : (
                        <button disabled className="inline-flex min-h-10 cursor-not-allowed items-center whitespace-nowrap rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-bold text-gray-400">ดูเอกสาร</button>
                      )}
                      <Link scroll={false} href={createUrlWithParams({ moveId: emp.id })} className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-[11px] font-bold text-orange-600 shadow-sm transition-all hover:bg-orange-500 hover:text-white">ย้ายบริษัท</Link>
                      <Link scroll={false} href={createUrlWithParams({ deleteId: emp.id })} className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[11px] font-bold text-red-600 shadow-sm transition-all hover:bg-red-600 hover:text-white">ลบ</Link>
                      <Link href={`/employees/edit/${emp.id}`} className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-bold text-blue-600 shadow-sm transition-all hover:bg-blue-600 hover:text-white">แก้ไข</Link>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP: ดูข้อมูลพนักงาน */}
      {viewEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-label="ข้อมูลพนักงาน" className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-gray-800">ข้อมูลพนักงาน</h2>
              <Link scroll={false} href={createUrlWithParams({}, true)} className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-gray-50 hover:bg-red-50 rounded-lg">✖</Link>
            </div>
            
            <div className="custom-scrollbar space-y-6 overflow-y-auto p-4 text-sm sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-1">รหัส</p>
                  <p className="font-bold text-lg text-blue-700">{viewEmployee.emp_code || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-1">ยอดค้างชำระ</p>
                  <p className="font-bold text-lg text-red-500">{Number(viewEmployee.debt_amount || 0).toLocaleString()} ฿</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-1">ประเภทเวิร์ค</p>
                  <p className="font-bold text-sm text-gray-800 bg-white px-3 py-1 rounded-lg border border-gray-200 inline-block mt-1">
                    {getWorkTypeName(viewEmployee.work_type_id)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/30 p-6 rounded-2xl border border-blue-100">
                <div><p className="text-xs font-bold text-gray-500 mb-1">ชื่อ-นามสกุล (TH)</p><p className="font-bold text-lg text-gray-800">{viewEmployee.first_name_th} {viewEmployee.last_name_th}</p></div>
                <div><p className="text-xs font-bold text-gray-500 mb-1">ชื่อ-นามสกุล (EN)</p><p className="font-bold text-lg text-gray-800 uppercase">{viewEmployee.first_name_en} {viewEmployee.last_name_en}</p></div>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-6">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> วันหมดอายุเอกสาร (Expiration Dates)
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                    <p className="text-[11px] font-bold text-orange-600 mb-1 uppercase tracking-wide">Passport</p>
                    <p className="font-bold text-sm text-gray-800">
                      {formatThaiDate(viewEmployee.passport_expiry_date)}
                    </p>
                  </div>

                  <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                    <p className="text-[11px] font-bold text-purple-600 mb-1 uppercase tracking-wide">Visa</p>
                    <p className="font-bold text-sm text-gray-800">
                      {formatThaiDate(viewEmployee.visa_expiry_date)}
                    </p>
                  </div>

                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                    <p className="text-[11px] font-bold text-emerald-600 mb-1 uppercase tracking-wide">Work Permit</p>
                    <p className="font-bold text-sm text-gray-800">
                      {formatThaiDate(viewEmployee.work_permit_expiry_date)}
                    </p>
                  </div>

                  <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100">
                    <p className="text-[11px] font-bold text-pink-600 mb-1 uppercase tracking-wide">90 Days</p>
                    <p className="font-bold text-sm text-gray-800">
                      {formatThaiDate(viewEmployee.ninety_day_report_date || viewEmployee.report_90_days_date)}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Link scroll={false} href={createUrlWithParams({}, true)} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 shadow-sm transition-colors">
                ปิดหน้าต่าง
              </Link>
            </div>
          </div>
        </div>
      )}

{/* POPUP: ดูเอกสาร 6 รูปแบบใหม่ */}
      {activeDocEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-label="เอกสารแนบพนักงาน" className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-5 border-b border-purple-100 bg-[#fdfaff] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#5b21b6] rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <h2 className="text-xl font-black text-[#4c1d95]">เอกสารแนบของ {activeDocEmp.first_name_th}</h2>
              </div>
              <Link scroll={false} href={createUrlWithParams({}, true)} className="flex items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm">
                ✖
              </Link>
            </div>
            
            {/* Body */}
            <div className="overflow-y-auto p-6 bg-white custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. ใบเก็บอัตลักษณ์ */}
                <div className="flex items-center justify-between p-5 border border-gray-200 rounded-2xl shadow-sm hover:border-purple-300 transition-colors bg-white">
                  <div className="pr-4">
                    <p className="font-extrabold text-gray-900 text-[15px]">1. ใบเก็บอัตลักษณ์</p>
                    <p className="text-[13px] text-gray-500 mt-1 leading-snug">เอกสารเก็บอัตลักษณ์พนักงาน</p>
                  </div>
                  {(activeDocEmp as any).identity_file ? (
                    <SecureDocumentButton employeeId={activeDocEmp.id} documentType={"identity" as any} className="min-w-[80px] min-h-[50px] flex flex-col items-center justify-center bg-[#f0f4ff] text-[#3b82f6] text-xs font-extrabold rounded-xl hover:bg-blue-600 hover:text-white transition-colors leading-tight px-3 shadow-sm">
                      <span>เปิดดู</span><span>ไฟล์</span>
                    </SecureDocumentButton>
                  ) : (
                    <span className="min-w-[80px] min-h-[50px] flex flex-col items-center justify-center bg-gray-50 text-gray-400 text-xs font-extrabold rounded-xl border border-gray-100 leading-tight px-3">
                      <span>ยังไม่มี</span><span>ไฟล์</span>
                    </span>
                  )}
                </div>

                {/* 2. รูปถ่ายพนักงาน */}
                <div className="flex items-center justify-between p-5 border border-gray-200 rounded-2xl shadow-sm hover:border-purple-300 transition-colors bg-white">
                  <div className="pr-4">
                    <p className="font-extrabold text-gray-900 text-[15px]">2. รูปถ่ายพนักงาน</p>
                    <p className="text-[13px] text-gray-500 mt-1 leading-snug">รูปถ่ายหน้าตรง</p>
                  </div>
                  {(activeDocEmp as any).profile_file ? (
                    <SecureDocumentButton employeeId={activeDocEmp.id} documentType={"profile" as any} className="min-w-[80px] min-h-[50px] flex flex-col items-center justify-center bg-[#f0f4ff] text-[#3b82f6] text-xs font-extrabold rounded-xl hover:bg-blue-600 hover:text-white transition-colors leading-tight px-3 shadow-sm">
                      <span>เปิดดู</span><span>ไฟล์</span>
                    </SecureDocumentButton>
                  ) : (
                    <span className="min-w-[80px] min-h-[50px] flex flex-col items-center justify-center bg-gray-50 text-gray-400 text-xs font-extrabold rounded-xl border border-gray-100 leading-tight px-3">
                      <span>ยังไม่มี</span><span>ไฟล์</span>
                    </span>
                  )}
                </div>

                {/* 3. หนังสือเดินทาง (Passport) */}
                <div className="flex items-center justify-between p-5 border border-gray-200 rounded-2xl shadow-sm hover:border-purple-300 transition-colors bg-white">
                  <div className="pr-4">
                    <p className="font-extrabold text-gray-900 text-[15px] leading-tight">3. หนังสือเดินทาง<br/>(Passport)</p>
                    <p className="text-[13px] text-gray-500 mt-1 leading-snug">สำเนาพาสปอร์ต</p>
                  </div>
                  {activeDocEmp.passport_file ? (
                    <SecureDocumentButton employeeId={activeDocEmp.id} documentType="passport" className="min-w-[80px] min-h-[50px] flex flex-col items-center justify-center bg-[#f0f4ff] text-[#3b82f6] text-xs font-extrabold rounded-xl hover:bg-blue-600 hover:text-white transition-colors leading-tight px-3 shadow-sm">
                      <span>เปิดดู</span><span>ไฟล์</span>
                    </SecureDocumentButton>
                  ) : (
                    <span className="min-w-[80px] min-h-[50px] flex flex-col items-center justify-center bg-gray-50 text-gray-400 text-xs font-extrabold rounded-xl border border-gray-100 leading-tight px-3">
                      <span>ยังไม่มี</span><span>ไฟล์</span>
                    </span>
                  )}
                </div>

                {/* 4. วีซ่า (Visa) */}
                <div className="flex items-center justify-between p-5 border border-gray-200 rounded-2xl shadow-sm hover:border-purple-300 transition-colors bg-white">
                  <div className="pr-4">
                    <p className="font-extrabold text-gray-900 text-[15px]">4. วีซ่า (Visa)</p>
                    <p className="text-[13px] text-gray-500 mt-1 leading-snug">สำเนาวีซ่าประจำตัว</p>
                  </div>
                  {activeDocEmp.visa_file ? (
                    <SecureDocumentButton employeeId={activeDocEmp.id} documentType="visa" className="min-w-[80px] min-h-[50px] flex flex-col items-center justify-center bg-[#f0f4ff] text-[#3b82f6] text-xs font-extrabold rounded-xl hover:bg-blue-600 hover:text-white transition-colors leading-tight px-3 shadow-sm">
                      <span>เปิดดู</span><span>ไฟล์</span>
                    </SecureDocumentButton>
                  ) : (
                    <span className="min-w-[80px] min-h-[50px] flex flex-col items-center justify-center bg-gray-50 text-gray-400 text-xs font-extrabold rounded-xl border border-gray-100 leading-tight px-3">
                      <span>ยังไม่มี</span><span>ไฟล์</span>
                    </span>
                  )}
                </div>

                {/* 5. ใบอนุญาตทำงาน (Work Permit) */}
                <div className="flex items-center justify-between p-5 border border-gray-200 rounded-2xl shadow-sm hover:border-purple-300 transition-colors bg-white">
                  <div className="pr-4">
                    <p className="font-extrabold text-gray-900 text-[15px] leading-tight">5. ใบอนุญาตทำงาน<br/>(Work Permit)</p>
                    <p className="text-[13px] text-gray-500 mt-1 leading-snug">สำเนา Work Permit</p>
                  </div>
                  {activeDocEmp.work_permit_file ? (
                    <SecureDocumentButton employeeId={activeDocEmp.id} documentType="work_permit" className="min-w-[80px] min-h-[50px] flex flex-col items-center justify-center bg-[#f0f4ff] text-[#3b82f6] text-xs font-extrabold rounded-xl hover:bg-blue-600 hover:text-white transition-colors leading-tight px-3 shadow-sm">
                      <span>เปิดดู</span><span>ไฟล์</span>
                    </SecureDocumentButton>
                  ) : (
                    <span className="min-w-[80px] min-h-[50px] flex flex-col items-center justify-center bg-gray-50 text-gray-400 text-xs font-extrabold rounded-xl border border-gray-100 leading-tight px-3">
                      <span>ยังไม่มี</span><span>ไฟล์</span>
                    </span>
                  )}
                </div>

                {/* 6. ใบรายงานตัว 90 วัน */}
                <div className="flex items-center justify-between p-5 border border-gray-200 rounded-2xl shadow-sm hover:border-purple-300 transition-colors bg-white">
                  <div className="pr-4">
                    <p className="font-extrabold text-gray-900 text-[15px]">6. ใบรายงานตัว 90 วัน</p>
                    <p className="text-[13px] text-gray-500 mt-1 leading-snug">รายงานตัว 90 วันล่าสุด</p>
                  </div>
                  {activeDocEmp.ninety_day_file ? (
                    <SecureDocumentButton employeeId={activeDocEmp.id} documentType="ninety_day" className="min-w-[80px] min-h-[50px] flex flex-col items-center justify-center bg-[#f0f4ff] text-[#3b82f6] text-xs font-extrabold rounded-xl hover:bg-blue-600 hover:text-white transition-colors leading-tight px-3 shadow-sm">
                      <span>เปิดดู</span><span>ไฟล์</span>
                    </SecureDocumentButton>
                  ) : (
                    <span className="min-w-[80px] min-h-[50px] flex flex-col items-center justify-center bg-gray-50 text-gray-400 text-xs font-extrabold rounded-xl border border-gray-100 leading-tight px-3">
                      <span>ยังไม่มี</span><span>ไฟล์</span>
                    </span>
                  )}
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 bg-[#fdfaff] flex justify-end rounded-b-3xl">
              <Link scroll={false} href={createUrlWithParams({}, true)} className="px-8 py-3 bg-white border border-gray-300 text-gray-800 text-sm font-bold rounded-xl hover:bg-gray-50 shadow-sm transition-colors">
                ปิดหน้าต่าง
              </Link>
            </div>

          </div>
        </div>
      )}

      {/* POPUP: ย้ายบริษัท */}
      {activeMoveEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-label="ย้ายบริษัทพนักงาน" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-orange-50">
              <h2 className="text-lg font-bold text-orange-800">ย้ายบริษัทสังกัด</h2>
              <Link scroll={false} href={createUrlWithParams({}, true)} className="text-gray-400 hover:text-red-500 transition-colors">✖</Link>
            </div>
            <form action={moveEmployeeAction}>
              <div className="p-6">
                <input type="hidden" name="id" value={activeMoveEmp.id} />
                <p className="text-sm text-gray-600 mb-5 bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                  ย้ายพนักงาน: <span className="font-bold text-gray-800">{activeMoveEmp.first_name_th} {activeMoveEmp.last_name_th}</span>
                </p>
                <label className="block font-bold text-gray-700 mb-2">เลือกบริษัทปลายทางใหม่</label>
                <select name="new_company_id" required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                  <option value="">-- เลือกบริษัท --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id} disabled={c.id === activeMoveEmp.company_id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                <Link scroll={false} href={createUrlWithParams({}, true)} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors">ยกเลิก</Link>
                <button type="submit" className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-md transition-colors">ยืนยันการย้าย</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: ลบพนักงาน */}
      {activeDeleteEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-label="ยืนยันการลบพนักงาน" className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-[2rem] bg-white p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">ยืนยันการลบ?</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">คุณต้องการลบข้อมูลของ <br/><span className="font-bold text-red-500 text-base">{activeDeleteEmp.first_name_th} {activeDeleteEmp.last_name_th}</span><br/> ใช่หรือไม่?</p>
            <form action={deleteEmployeeAction} className="flex gap-3 justify-center">
              <input type="hidden" name="id" value={activeDeleteEmp.id} />
              <Link scroll={false} href={createUrlWithParams({}, true)} className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">ยกเลิก</Link>
              <button type="submit" className="flex-1 px-5 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:bg-red-700 transition-colors">ลบข้อมูล</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}