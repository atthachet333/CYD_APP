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

// ✅ อัปเกรดฟังก์ชันแปลงวันที่: ถ้าไม่มีข้อมูลให้ขึ้นว่า "ไม่ได้ระบุ"
function formatThaiDate(dateString: any) {
  if (!dateString) return "ไม่ได้ระบุ";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "ไม่ได้ระบุ"; // เช็คว่าเป็นวันที่จริงๆ ไหม
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
  const employeeFilter: any = {};

  if (role === "COMPANY_USER" && userCompanyId) {
    employeeFilter.company_id = Number(userCompanyId);
  }

  const rawEmployees = await prisma.employee_document_profiles.findMany({
    where: employeeFilter,
    orderBy: { created_at: "desc" },
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

  const companies = await prisma.companies.findMany({
    orderBy: { company_name: "asc" },
  });

  const companyMap = new Map(
    companies.map((company) => [
      company.id,
      company.company_name,
    ])
  );

  const documentExpiryAlerts = buildDocumentExpiryAlerts(rawEmployees, companyMap);

  const employees = Array.from(
    new Map(
      rawEmployees.map((emp) => [
        `${emp.emp_code || "no-code"}-${emp.first_name_th || "no-fname"}`,
        emp,
      ])
    ).values()
  );

  const resolvedSearchParams = await searchParams;
  const viewId = resolvedSearchParams?.viewId;
  const docId = resolvedSearchParams?.docId;
  const moveId = resolvedSearchParams?.moveId;
  const deleteId = resolvedSearchParams?.deleteId;

  const viewEmployee = viewId ? rawEmployees.find((e) => e.id.toString() === viewId) : null;
  const activeDocEmp = docId ? rawEmployees.find((e) => e.id.toString() === docId) : null;
  const activeMoveEmp = moveId ? rawEmployees.find((e) => e.id.toString() === moveId) : null;
  const activeDeleteEmp = deleteId ? rawEmployees.find((e) => e.id.toString() === deleteId) : null;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto font-sans text-gray-800 bg-[#f4f7fe] min-h-screen relative">
      {(viewEmployee || activeDocEmp || activeMoveEmp || activeDeleteEmp) && <RouteModalEffects closeHref="/employees" />}
      
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
              {employees.map((emp: any) => {
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
                    <Link href={`/employees?viewId=${emp.id}`} scroll={false} className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="รายละเอียด">
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
                        <Link href={`?docId=${emp.id}`} scroll={false} className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-[11px] font-bold text-purple-600 shadow-sm transition-all hover:bg-purple-600 hover:text-white">ดูเอกสาร</Link>
                      ) : (
                        <button disabled className="inline-flex min-h-10 cursor-not-allowed items-center whitespace-nowrap rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-bold text-gray-400">ดูเอกสาร</button>
                      )}
                      <Link href={`?moveId=${emp.id}`} scroll={false} className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-[11px] font-bold text-orange-600 shadow-sm transition-all hover:bg-orange-500 hover:text-white">ย้ายบริษัท</Link>
                      <Link href={`?deleteId=${emp.id}`} scroll={false} className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[11px] font-bold text-red-600 shadow-sm transition-all hover:bg-red-600 hover:text-white">ลบ</Link>
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
              <Link href="/employees" className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-gray-50 hover:bg-red-50 rounded-lg">✖</Link>
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

              {/* ✅ แก้ไข: ดักชื่อ Field เผื่อไว้ให้ครอบคลุม (เชื่อมข้อมูลจาก DB จริงๆ) */}
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
              <Link href="/employees" className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 shadow-sm transition-colors">
                ปิดหน้าต่าง
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: ดูเอกสาร 4 ปุ่ม */}
      {activeDocEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-label="เอกสารแนบพนักงาน" className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-purple-50">
              <h2 className="text-lg font-bold text-purple-800">เอกสารแนบของ {activeDocEmp.first_name_th}</h2>
              <Link href="/employees" className="text-gray-400 hover:text-red-500 transition-colors">✖</Link>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6">
              {activeDocEmp.document_file_name && (
                <div className="mb-4 flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold text-gray-800">Main Document</p>
                    <p className="mt-1 break-all text-xs text-gray-500" title={activeDocEmp.document_file_name}>{activeDocEmp.document_file_name}</p>
                  </div>
                  <SecureDocumentButton viewUrl={documentHref(activeDocEmp.document_file_name)} className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">เปิดดูไฟล์</SecureDocumentButton>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold text-gray-800">Passport (PP)</p>
                    <p className="text-xs text-gray-500 mt-1">หนังสือเดินทาง</p>
                  </div>
                  <SecureDocumentButton employeeId={activeDocEmp.id} documentType="passport" className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">เปิดดูไฟล์</SecureDocumentButton>
                </div>
                <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold text-gray-800">Visa (VS)</p>
                    <p className="text-xs text-gray-500 mt-1">วีซ่า</p>
                  </div>
                  <SecureDocumentButton employeeId={activeDocEmp.id} documentType="visa" className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">เปิดดูไฟล์</SecureDocumentButton>
                </div>
                <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold text-gray-800">Work Permit</p>
                    <p className="text-xs text-gray-500 mt-1">ใบอนุญาตทำงาน</p>
                  </div>
                  <SecureDocumentButton employeeId={activeDocEmp.id} documentType="work_permit" className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">เปิดดูไฟล์</SecureDocumentButton>
                </div>
                <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold text-gray-800">90 Days (90D)</p>
                    <p className="text-xs text-gray-500 mt-1">รายงานตัว 90 วัน</p>
                  </div>
                  <SecureDocumentButton employeeId={activeDocEmp.id} documentType="ninety_day" className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">เปิดดูไฟล์</SecureDocumentButton>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Link href="/employees" className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 shadow-sm transition-colors">ปิดหน้าต่าง</Link>
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
              <Link href="/employees" className="text-gray-400 hover:text-red-500 transition-colors">✖</Link>
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
                <Link href="/employees" className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors">ยกเลิก</Link>
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
              <Link href="/employees" className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">ยกเลิก</Link>
              <button type="submit" className="flex-1 px-5 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:bg-red-700 transition-colors">ลบข้อมูล</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
