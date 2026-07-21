// src/app/employees/create/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import ApiActionForm from "./ApiActionForm";
import SecureDocumentButton from "@/components/SecureDocumentButton";
import RouteModalEffects from "@/components/RouteModalEffects";

function documentHref(documentFileName: string) {
  const filename = documentFileName.split(/[\\/]/).pop() || "";
  return filename ? `/api/documents/${encodeURIComponent(filename)}` : "";
}

// ✅ ฟังก์ชันแปลงวันที่ให้อ่านง่าย (ถ้าไม่มีข้อมูลให้แสดงว่า "ไม่ได้ระบุ")
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
  searchParams: Promise<{ docId?: string; moveId?: string; deleteId?: string; deleteCompanyId?: string; viewId?: string }>;
}

const getWorkTypeName = (id: number | null) => {
  if (id === 1) return "MOU";
  if (id === 2) return "มติ ครม. 11 พ.ย. 68";
  if (id === 3) return "มติ ครม. 2 ธ.ค. 68";
  if (id === 4) return "มติ ครม. 24 ก.ย. 67";
  return "ไม่ระบุ";
};

const COMPANY_LIST = [
  "บริษัท SYAQUA SIAM COMPANY LIMITED",
  "บริษัท วิพล พาราไดซ์ จำกัด",
  "บริษัท เอเวียนท์ (ประเทศไทย) จำกัด",
  "บริษัท ไคเมท เทคโนโลยี ดีเวลลอปเม้นท์ จำกัด",
  "บริษัท ไดนามิครีไซเคิล จำกัด",
  "บริษัท แม่น้ำสแตนเลสไวร์ จำกัด (มหาชน)",
  "บริษัท อีท แอม อา กรุ๊ป จำกัด",
  "บริษัท เอ็ม แอนด์ เอช 2023 (ประเทศไทย) จำกัด",
  "บริษัท เอสพีเอ็กซ์ เอ็กซ์เพรส (ประเทศไทย) จำกัด (FSOCW-สมุทรสาคร)",
  "บริษัท เอสพีเอ็กซ์ เอ็กซ์เพรส (ประเทศไทย) จำกัด (HUB)",
  "บริษัท เอสพีเอ็กซ์ เอ็กซ์เพรส (ประเทศไทย) จำกัด (SOCE-บัวโรย)",
  "บริษัท เอสพีเอ็กซ์ เอ็กซ์เพรส (ประเทศไทย) จำกัด (SOCN-วังน้อย)",
  "บริษัท เอสพีเอ็กซ์ เอ็กซ์เพรส (ประเทศไทย) จำกัด (SOCW-สมุทรสาคร)",
];

export default async function CreateEmployeePage({ searchParams }: PageProps) {
  const debugStart = Date.now();

  console.log("\n==================================================");
  console.log("[EMPLOYEES_CREATE_PAGE][START]");
  console.log("time:", new Date().toISOString());
  console.log("==================================================");

  const session = await getServerSession();

  const role = String((session?.user as any)?.role || "").toUpperCase();
  const canViewDocs = role !== "CUSTOMER";

  const resolvedParams = await searchParams;
  const docId = resolvedParams?.docId;
  const moveId = resolvedParams?.moveId;
  const deleteId = resolvedParams?.deleteId;
  const deleteCompanyId = resolvedParams?.deleteCompanyId;
  const viewId = resolvedParams?.viewId; 

  const companies = await prisma.companies.findMany({
    orderBy: { company_name: "asc" },
  });

  const spxCompanies = companies.filter(
    (c) =>
      c.company_name.toUpperCase().includes("SPX") ||
      c.company_name.includes("เอสพีเอ็กซ์")
  );

  const allEmployees = await prisma.employee_document_profiles.findMany();

  const countByCompanyId = allEmployees.reduce<Record<string, number>>((acc, emp) => {
    const key = String(emp.company_id ?? "NULL");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const suspiciousEmployees = allEmployees.filter((emp) => {
    const empCode = String(emp.emp_code || "").toUpperCase();
    const docName = String(emp.document_file_name || "").toUpperCase();

    return (
      empCode.includes("SPX") ||
      docName.includes("SPX") ||
      docName.startsWith("COMP") ||
      [11, 12, 13, 14, 15].includes(Number(emp.company_id))
    );
  });

  const companySummaries = companies.map((comp) => {
    const emps = allEmployees.filter((emp) => emp.company_id === comp.id);
    const count = emps.length;
    const totalDebt = emps.reduce((sum, emp) => sum + (Number(emp.debt_amount) || 0), 0);

    return { ...comp, employee_document_profiles: emps, count, totalDebt };
  });

  const activeDocEmp = docId ? allEmployees.find((e) => e.id.toString() === docId) : null;
  const activeMoveEmp = moveId ? allEmployees.find((e) => e.id.toString() === moveId) : null;
  const activeDeleteEmp = deleteId ? allEmployees.find((e) => e.id.toString() === deleteId) : null;
  const viewEmployee = viewId ? allEmployees.find((e) => e.id.toString() === viewId) : null; 

  const activeDeleteCompany = deleteCompanyId
    ? companySummaries.find((c) => c.id.toString() === deleteCompanyId)
    : null;

  return (
    <div className="font-sans text-gray-800 bg-[#f4f7fe] min-h-screen p-4 md:p-6 lg:p-8 relative">
      {(viewEmployee || activeDeleteCompany || activeDocEmp || activeMoveEmp || activeDeleteEmp) && <RouteModalEffects closeHref="/employees/create" />}
      
      {/* ----------------- ฟอร์มเพิ่มพนักงานใหม่ ----------------- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
        <div className="bg-white border-b border-gray-100 p-6 flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-[#111c44]">ลงทะเบียนข้อมูลพนักงาน (เอกสาร)</h1>
        </div>
        
        <div className="p-6 md:p-8">
          <ApiActionForm endpoint="/api/employee/create" className="space-y-6 text-sm" successMessage="บันทึกข้อมูลสำเร็จ">
            <div>
              <label className="block font-bold text-gray-700 mb-1.5">รหัสพนักงาน</label>
              <input type="text" name="emp_code" placeholder="เช่น EMP001" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-colors" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">ชื่อภาษาไทย</label>
                <input type="text" name="first_name_th" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">นามสกุลภาษาไทย</label>
                <input type="text" name="last_name_th" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">ชื่อภาษาอังกฤษ</label>
                <input type="text" name="first_name_en" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase bg-gray-50/50 focus:bg-white transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">นามสกุลภาษาอังกฤษ</label>
                <input type="text" name="last_name_en" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase bg-gray-50/50 focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">เพศ</label>
                <select name="gender" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-colors">
                  <option value="">-- เลือกเพศ --</option>
                  <option value="Male">ชาย (Male)</option>
                  <option value="Female">หญิง (Female)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">วันเดือนปีเกิด (ค.ศ.)</label>
                <input type="date" name="birth_date" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-colors text-gray-600" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1.5">บริษัท <span className="text-red-500">*</span></label>
              <select name="company_name_val" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-colors">
                <option value="">-- เลือกบริษัท --</option>
                {COMPANY_LIST.map((cName, idx) => (
                  <option key={idx} value={cName}>{cName}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">ยอดค้างชำระ (บาท)</label>
                <input type="number" step="0.01" name="debt_amount" defaultValue="0.00" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">ประเภทเวิร์ค</label>
                <select name="work_type_id" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-colors text-gray-700">
                  <option value="">-- เลือกประเภทเวิร์ค --</option>
                  <option value="1">MOU</option>
                  <option value="2">มติ ครม. 11 พ.ย. 68</option>
                  <option value="3">มติ ครม. 2 ธ.ค. 68</option>
                  <option value="4">มติ ครม. 24 ก.ย. 67</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">สิทธิรักษาสุขภาพ</label>
                <select name="healthcare_rights" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-gray-700" required>
                  <option value="ประกันสังคม">ประกันสังคม</option>
                  <option value="ใบประกันสุขภาพ">ใบประกันสุขภาพ</option>
                  <option value="ไม่มี">ไม่มี</option>
                </select>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm mb-6 mt-6">
              <h3 className="font-bold text-gray-800 text-lg mb-4">อัปโหลดเอกสารประจำตัวพนักงาน</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 hover:border-blue-400 transition-colors">
                  <label className="block text-sm font-bold text-gray-700 mb-2">หนังสือเดินทาง (Passport - PP)</label>
                  <input type="file" name="passport_document" accept=".pdf,image/*" className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 cursor-pointer bg-white border border-gray-200 p-2" />
                </div>
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 hover:border-blue-400 transition-colors">
                  <label className="block text-sm font-bold text-gray-700 mb-2">วีซ่า (Visa - VS)</label>
                  <input type="file" name="visa_document" accept=".pdf,image/*" className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 cursor-pointer bg-white border border-gray-200 p-2" />
                </div>
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 hover:border-blue-400 transition-colors">
                  <label className="block text-sm font-bold text-gray-700 mb-2">ใบอนุญาตทำงาน (Work Permit)</label>
                  <input type="file" name="work_permit_document" accept=".pdf,image/*" className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 cursor-pointer bg-white border border-gray-200 p-2" />
                </div>
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 hover:border-blue-400 transition-colors">
                  <label className="block text-sm font-bold text-gray-700 mb-2">รายงานตัว 90 วัน (90D)</label>
                  <input type="file" name="ninety_day_document" accept=".pdf,image/*" className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 cursor-pointer bg-white border border-gray-200 p-2" />
                </div>
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 hover:border-blue-400 transition-colors">
                  <label className="block text-sm font-bold text-gray-700 mb-2">ใบเก็บอัตลักษณ์</label>
                  <input type="file" name="identity_document" accept=".pdf,image/*" className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 cursor-pointer bg-white border border-gray-200 p-2" />
                </div>
                {/* ✅ เพิ่มช่องอัปโหลด โปรไฟล์พนักงาน */}
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 hover:border-blue-400 transition-colors">
                  <label className="block text-sm font-bold text-gray-700 mb-2">โปรไฟล์พนักงาน</label>
                  <input type="file" name="profile_document" accept=".pdf,image/*" className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 cursor-pointer bg-white border border-gray-200 p-2" />
                </div>
              </div>
            </div>

            <div className="border border-gray-200 p-6 rounded-2xl bg-gray-50/50">
              <h3 className="font-bold text-gray-800 mb-5">ข้อมูลวันสำคัญ (แก้ไขเองได้)</h3>
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
                {/* ✅ เอาช่องกรอกเลขที่ใบเก็บอัตลักษณ์ออก และให้ช่อง 90 วันใช้พื้นที่ 2 คอลัมน์เต็มเหมือนเดิม */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">วันรายงานตัว 90 วันล่าสุด</label>
                  <input type="date" name="ninety_day_report_date" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-gray-600" />
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end items-center border-t border-gray-100">
              <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition active:scale-95">
                บันทึกข้อมูลพนักงาน
              </button>
            </div>
          </ApiActionForm>
        </div>
      </div>

      {/* ----------------- ตารางสรุป ----------------- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden pb-8">
        <div className="bg-white border-b border-gray-100 p-6 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-[#111c44]">สรุปตามบริษัท</h2>
        </div>
        
        <div className="p-6 md:p-8 bg-gray-50/30">
          <div className="space-y-4">
            {companySummaries.map((comp) => (
              <details key={comp.id} className="group border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden list-none [&::-webkit-details-marker]:hidden">
                <summary className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 cursor-pointer hover:bg-blue-50/30 transition-colors">
                  <div className="flex items-center space-x-3 mb-3 md:mb-0">
                    <span className="font-extrabold text-gray-800 text-base">{comp.company_name}</span>
                    <Link href={`?deleteCompanyId=${comp.id}`} scroll={false} className="text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm active:scale-95">
                      ลบ
                    </Link>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="bg-gray-50 text-gray-600 px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
                      จำนวนคน: <span className="font-bold">{comp.count}</span>
                    </span>
                    <span className="bg-gray-50 text-gray-600 px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
                      ยอดค้างรวม: <span className="font-bold">{comp.totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </span>
                  </div>
                </summary>
                
                <div className="p-0 bg-white border-t border-gray-100 text-sm">
                  {comp.count > 0 ? (
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-xs whitespace-nowrap min-w-[1200px]">
                        <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100 uppercase tracking-wider">
                          <tr>
                            <th className="p-4 pl-6 font-bold">รหัสพนักงาน</th>
                            <th className="p-4 font-bold">ชื่อ-นามสกุล</th>
                            <th className="p-4 font-bold text-center">ประเภทเวิร์ค</th>
                            {/* ✅ เพิ่มคอลัมน์ สิทธิรักษาสุขภาพ */}
                            <th className="p-4 font-bold text-center">สิทธิรักษาสุขภาพ</th>
                            <th className="p-4 font-bold text-center">เอกสารที่มี</th>
                            <th className="p-4 font-bold text-center">ดูข้อมูล</th>
                            <th className="p-4 font-bold text-center">สถานะ</th>
                            <th className="p-4 pr-6 font-bold text-center">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {comp.employee_document_profiles.map((emp: any) => (
                            <tr key={emp.id} className="hover:bg-blue-50/20 transition-colors">
                              <td className="p-4 pl-6 font-bold text-[#0f2b6f] text-[13px]">{emp.emp_code || '-'}</td>
                              <td className="p-4">
                                <div className="font-bold text-gray-800 text-[13px]">{emp.first_name_th} {emp.last_name_th}</div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-wider">{emp.first_name_en} {emp.last_name_en}</div>
                              </td>
                              <td className="p-4 text-center">
                                <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-blue-100">
                                  {getWorkTypeName(emp.work_type_id)}
                                </span>
                              </td>
                              {/* ✅ ข้อมูลสิทธิรักษาสุขภาพ */}
                              <td className="p-4 text-center">
                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border shadow-sm ${emp.healthcare_rights && emp.healthcare_rights !== 'ไม่มี' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                  {emp.healthcare_rights && emp.healthcare_rights !== 'ไม่มี' ? emp.healthcare_rights : 'ไม่มี'}
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
                                <Link href={`/employees/create?viewId=${emp.id}`} scroll={false} className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="รายละเอียด">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </Link>
                              </td>

                              <td className="p-4 text-center">
                                <Link href={`#`} className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-600 border border-orange-200 shadow-sm hover:bg-orange-500 hover:text-white transition-all whitespace-nowrap">
                                  รอต่อเอกสาร
                                </Link>
                              </td>

                              <td className="p-4 pr-6 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {canViewDocs ? (
                                    <Link href={`?docId=${emp.id}`} scroll={false} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-white text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white transition-all shadow-sm">
                                      ดูเอกสาร
                                    </Link>
                                  ) : (
                                    <button disabled className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed">ดูเอกสาร</button>
                                  )}
                                  <Link href={`?moveId=${emp.id}`} scroll={false} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-white text-orange-600 border-orange-200 hover:bg-orange-500 hover:text-white transition-all shadow-sm">ย้ายบริษัท</Link>
                                  <Link href={`?deleteId=${emp.id}`} scroll={false} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-white text-red-600 border-red-200 hover:bg-red-600 hover:text-white transition-all shadow-sm">ลบ</Link>
                                  <Link href={`/employees/edit/${emp.id}`} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm">แก้ไขข้อมูล</Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-400 text-sm font-medium bg-gray-50/50">ยังไม่มีพนักงานในบริษัทนี้</div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* ===================== POPUPS ===================== */}

      {/* POPUP: ดูข้อมูลพนักงาน */}
      {viewEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-label="ข้อมูลพนักงาน" className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-gray-800">ข้อมูลพนักงาน</h2>
              <Link href="/employees/create" className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-gray-50 hover:bg-red-50 rounded-lg">✖</Link>
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
              <Link href="/employees/create" className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 shadow-sm transition-colors">
                ปิดหน้าต่าง
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Popup แจ้งเตือนการลบบริษัท */}
      {activeDeleteCompany && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-label="จัดการบริษัท" className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-[2rem] bg-white p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {activeDeleteCompany.count > 0 ? (
              <>
                <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">ลบไม่ได้!</h2>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                  บริษัท <br/><span className="font-bold text-orange-500 text-base">{activeDeleteCompany.company_name}</span><br/>
                  ยังมีพนักงานอยู่ <span className="font-bold text-gray-800">{activeDeleteCompany.count}</span> คน<br/>
                  กรุณาย้ายหรือลบพนักงานออกก่อนครับ
                </p>
                <div className="flex justify-center">
                  <Link href="/employees/create" className="w-full px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">รับทราบ</Link>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">ยืนยันการลบ?</h2>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                  คุณต้องการลบบริษัท <br/><span className="font-bold text-red-500 text-base">{activeDeleteCompany.company_name}</span><br/> ใช่หรือไม่? ข้อมูลที่ลบจะไม่สามารถกู้คืนได้
                </p>
                <ApiActionForm endpoint="/api/company/delete" className="flex gap-3 justify-center">
                  <input type="hidden" name="id" value={activeDeleteCompany.id} />
                  <Link href="/employees/create" className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">ยกเลิก</Link>
                  <button type="submit" className="flex-1 px-5 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:bg-red-700 transition-colors">ลบข้อมูล</button>
                </ApiActionForm>
              </>
            )}
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
              <Link scroll={false} href="/employees/create" className="flex items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm">
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
              <Link scroll={false} href="/employees/create" className="px-8 py-3 bg-white border border-gray-300 text-gray-800 text-sm font-bold rounded-xl hover:bg-gray-50 shadow-sm transition-colors">
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
              <Link href="/employees/create" className="text-gray-400 hover:text-red-500 transition-colors">✖</Link>
            </div>
            <ApiActionForm endpoint="/api/employee/move">
              <div className="p-6">
                <input type="hidden" name="id" value={activeMoveEmp.id} />
                <p className="text-sm text-gray-600 mb-5 bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                  ย้ายพนักงาน: <span className="font-bold text-gray-800">{activeMoveEmp.first_name_th} {activeMoveEmp.last_name_th}</span>
                </p>
                <label className="block font-bold text-gray-700 mb-2">เลือกบริษัทปลายทางใหม่</label>
                <select name="new_company_id" required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                  <option value="">-- เลือกบริษัท --</option>
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id} disabled={c.id === activeMoveEmp.company_id}>
                      {c.company_name} {c.id === activeMoveEmp.company_id ? '(ปัจจุบัน)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                <Link href="/employees/create" className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors">ยกเลิก</Link>
                <button type="submit" className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-md transition-colors">ยืนยันการย้าย</button>
              </div>
            </ApiActionForm>
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
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              คุณต้องการลบข้อมูลของ <br/><span className="font-bold text-red-500 text-base">{activeDeleteEmp.first_name_th} {activeDeleteEmp.last_name_th}</span><br/> ใช่หรือไม่? ข้อมูลที่ลบจะไม่สามารถกู้คืนได้
            </p>
            <ApiActionForm endpoint="/api/employee/delete" className="flex gap-3 justify-center">
              <input type="hidden" name="id" value={activeDeleteEmp.id} />
              <Link href="/employees/create" className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">ยกเลิก</Link>
              <button type="submit" className="flex-1 px-5 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:bg-red-700 transition-colors">ลบข้อมูล</button>
            </ApiActionForm>
          </div>
        </div>
      )}

    </div>
  );
}