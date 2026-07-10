import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link"; 
import SecureDocumentButton from "@/components/SecureDocumentButton";
import DocumentExpiryNotificationSection from "@/components/DocumentExpiryNotificationSection";
import { buildDocumentExpiryAlerts } from "@/lib/document-alerts";

function documentHref(documentFileName: string) {
  if (/^https?:\/\//i.test(documentFileName) || documentFileName.startsWith("/")) {
    return documentFileName;
  }
  return `/api/documents/${encodeURIComponent(documentFileName)}`;
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

  const companies = await prisma.companies.findMany({
    orderBy: { company_name: "asc" },
  });
  const companyMap = new Map(companies.map((company) => [company.id, company.company_name]));
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
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#111c44]">จัดการข้อมูลพนักงาน</h1>
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
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 border-b border-gray-100 uppercase tracking-wider text-[11px] md:text-xs">
                <th className="p-4 font-bold pl-6">รหัส</th>
                <th className="p-4 font-bold">ชื่อ-นามสกุล</th>
                <th className="p-4 font-bold text-center">ประเภทเวิร์ค</th>
                <th className="p-4 font-bold text-center">เอกสาร</th>
                <th className="p-4 font-bold text-center pr-6">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp: any) => (
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
                  <td className="p-4 text-center pr-6">
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`/employees?viewId=${emp.id}`} scroll={false} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200" title="รายละเอียด">
                        👁️
                      </Link>
                      {canViewDocs ? (
                        <Link href={`?docId=${emp.id}`} scroll={false} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-white text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white transition-all shadow-sm">ดูเอกสาร</Link>
                      ) : (
                        <button disabled className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed">ดูเอกสาร</button>
                      )}
                      <Link href={`?moveId=${emp.id}`} scroll={false} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-white text-orange-600 border-orange-200 hover:bg-orange-500 hover:text-white transition-all shadow-sm">ย้ายบริษัท</Link>
                      <Link href={`?deleteId=${emp.id}`} scroll={false} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-white text-red-600 border-red-200 hover:bg-red-600 hover:text-white transition-all shadow-sm">ลบ</Link>
                      
                      {/* แก้ไขลิงก์ตรงนี้ให้ชี้ไปที่ /employee (ไม่มี s) ให้ตรงกับโฟลเดอร์ */}
                      <Link href={`/employees/edit/${emp.id}`} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white transition-all block shadow-sm">
                        แก้ไข
                      </Link>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP: ดูข้อมูลพนักงาน */}
      {viewEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-gray-800">ข้อมูลพนักงาน</h2>
              <Link href="/employees" className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-gray-50 hover:bg-red-50 rounded-lg">✖</Link>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-sm custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
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
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Link href="/employees" className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 shadow-sm">ปิดหน้าต่าง</Link>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: ดูเอกสาร 4 ปุ่ม */}
      {activeDocEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-purple-50">
              <h2 className="text-lg font-bold text-purple-800">เอกสารแนบของ {activeDocEmp.first_name_th}</h2>
              <Link href="/employees" className="text-gray-400 hover:text-red-500 transition-colors">✖</Link>
            </div>
            <div className="p-6">
              {activeDocEmp.document_file_name && (
                <div className="p-4 border border-gray-200 rounded-2xl flex justify-between items-center bg-white shadow-sm">
                  <div>
                    <p className="font-bold text-gray-800">Main Document</p>
                    <p className="text-xs text-gray-500 mt-1">{activeDocEmp.document_file_name}</p>
                  </div>
                  <a href={documentHref(activeDocEmp.document_file_name)} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">เปิดดูไฟล์</a>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-2xl flex justify-between items-center bg-white shadow-sm">
                  <div>
                    <p className="font-bold text-gray-800">Passport (PP)</p>
                    <p className="text-xs text-gray-500 mt-1">หนังสือเดินทาง</p>
                  </div>
                  <SecureDocumentButton employeeId={activeDocEmp.id} documentType="passport" className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">เปิดดูไฟล์</SecureDocumentButton>
                </div>
                <div className="p-4 border border-gray-200 rounded-2xl flex justify-between items-center bg-white shadow-sm">
                  <div>
                    <p className="font-bold text-gray-800">Visa (VS)</p>
                    <p className="text-xs text-gray-500 mt-1">วีซ่า</p>
                  </div>
                  <SecureDocumentButton employeeId={activeDocEmp.id} documentType="visa" className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">เปิดดูไฟล์</SecureDocumentButton>
                </div>
                <div className="p-4 border border-gray-200 rounded-2xl flex justify-between items-center bg-white shadow-sm">
                  <div>
                    <p className="font-bold text-gray-800">Work Permit</p>
                    <p className="text-xs text-gray-500 mt-1">ใบอนุญาตทำงาน</p>
                  </div>
                  <SecureDocumentButton employeeId={activeDocEmp.id} documentType="work_permit" className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">เปิดดูไฟล์</SecureDocumentButton>
                </div>
                <div className="p-4 border border-gray-200 rounded-2xl flex justify-between items-center bg-white shadow-sm">
                  <div>
                    <p className="font-bold text-gray-800">90 Days (90D)</p>
                    <p className="text-xs text-gray-500 mt-1">รายงานตัว 90 วัน</p>
                  </div>
                  <SecureDocumentButton employeeId={activeDocEmp.id} documentType="ninety_day" className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm">เปิดดูไฟล์</SecureDocumentButton>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Link href="/employees" className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 shadow-sm">ปิดหน้าต่าง</Link>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: ย้ายบริษัท */}
      {activeMoveEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                <Link href="/employees" className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100">ยกเลิก</Link>
                <button type="submit" className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-md">ยืนยันการย้าย</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: ลบพนักงาน */}
      {activeDeleteEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 animate-in fade-in zoom-in-95 duration-200">
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
