// src/app/employees/create/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import ApiActionForm from "./ApiActionForm";

function documentHref(documentFileName: string) {
  if (/^https?:\/\//i.test(documentFileName) || documentFileName.startsWith("/")) {
    return documentFileName;
  }

  return `/api/documents/${encodeURIComponent(documentFileName)}`;
}

interface PageProps {
  // 🟢 เพิ่ม deleteCompanyId เข้ามาใน พารามิเตอร์ เพื่อใช้ดักการเปิด Popup ลบบริษัท
  searchParams: Promise<{ docId?: string; moveId?: string; deleteId?: string; deleteCompanyId?: string }>;
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
  const session = await getServerSession();
  const role = String((session?.user as any)?.role || "").toUpperCase();
  const canViewDocs = role !== "CUSTOMER";

  const resolvedParams = await searchParams;
  const docId = resolvedParams?.docId;
  const moveId = resolvedParams?.moveId;
  const deleteId = resolvedParams?.deleteId;
  const deleteCompanyId = resolvedParams?.deleteCompanyId;

  const companies = await prisma.companies.findMany({ orderBy: { company_name: 'asc' } });
  const allEmployees = await prisma.employee_document_profiles.findMany();

  const companySummaries = companies.map(comp => {
    const emps = allEmployees.filter(emp => emp.company_id === comp.id);
    const count = emps.length;
    const totalDebt = emps.reduce((sum, emp) => sum + (Number(emp.debt_amount) || 0), 0);
    return { ...comp, employee_document_profiles: emps, count, totalDebt };
  });

  const activeDocEmp = docId ? allEmployees.find(e => e.id.toString() === docId) : null;
  const activeMoveEmp = moveId ? allEmployees.find(e => e.id.toString() === moveId) : null;
  const activeDeleteEmp = deleteId ? allEmployees.find(e => e.id.toString() === deleteId) : null;
  
  // 🟢 ดึงข้อมูลบริษัทที่กำลังจะถูกลบ (เพื่อเอาไปแสดงใน Popup)
  const activeDeleteCompany = deleteCompanyId ? companySummaries.find(c => c.id.toString() === deleteCompanyId) : null;

  return (
    <div className="font-sans text-gray-800 bg-[#f4f7fe] min-h-screen p-4 md:p-6 lg:p-8 relative">
      
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            <div className="border border-blue-200 bg-blue-50/40 p-6 rounded-2xl">
              <label className="block font-bold text-gray-800 mb-3">อัปโหลดเอกสารหลัก <span className="text-red-500 text-sm font-normal">(ชื่อไฟล์เดิมเท่านั้น ตาม รหัสพนักงาน)</span></label>
              <input type="file" name="main_document" accept=".pdf, image/*" className="w-full text-sm bg-white border border-gray-200 rounded-xl p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors" />
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
                    {/* 🟢 เปลี่ยนปุ่มลบเป็น Link เพื่อให้เด้ง Popup แทนการส่งค่าตรงๆ */}
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
                      <table className="w-full text-left text-xs whitespace-nowrap min-w-[900px]">
                        <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100 uppercase tracking-wider">
                          <tr>
                            <th className="p-4 pl-6 font-bold">รหัสพนักงาน</th>
                            <th className="p-4 font-bold">ชื่อ-นามสกุล</th>
                            <th className="p-4 font-bold text-center">ประเภทเวิร์ค</th>
                            <th className="p-4 font-bold text-center">เอกสารที่มี</th>
                            <th className="p-4 font-bold text-right">ยอดค้าง (บาท)</th>
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
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold border shadow-sm ${emp.passport_number ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>PASSPORT</span>
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold border shadow-sm ${emp.visa_number ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>VISA</span>
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold border shadow-sm ${emp.work_permit_number ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>WORK PERMIT</span>
                                </div>
                              </td>
                              <td className="p-4 text-right font-bold text-red-500 text-[13px]">
                                {Number(emp.debt_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-4 pr-6 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {canViewDocs ? (
                                    <Link href={`?docId=${emp.id}`} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-white text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white transition-all shadow-sm">
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

      {/* 🟢 Popup แจ้งเตือนการลบบริษัท */}
      {activeDeleteCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* แยกกรณี 1: ถ้ามีพนักงานอยู่ (ไม่อนุญาตให้ลบ) */}
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
              /* กรณี 2: จำนวนพนักงานเป็น 0 (อนุญาตให้ลบ พร้อมถามยืนยัน) */
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

      {activeDocEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-purple-50">
              <h2 className="text-lg font-bold text-purple-800">เอกสารแนบของ {activeDocEmp.first_name_th}</h2>
              <Link href="/employees/create" className="text-gray-400 hover:text-red-500 transition-colors">ถ</Link>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 border border-gray-200 rounded-2xl flex justify-between items-center bg-white shadow-sm">
                <div>
                  <p className="font-bold text-gray-800">เอกสารหลักรวม</p>
                  <p className="text-xs text-gray-500 mt-1">ไฟล์แนบรวม (PP, VISA, WP)</p>
                </div>
                {activeDocEmp.document_file_name ? (
                  <a href={documentHref(activeDocEmp.document_file_name)} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-purple-100 text-purple-700 text-xs font-bold rounded-xl hover:bg-purple-600 hover:text-white transition-colors">เปิดดูไฟล์</a>
                ) : (
                  <button disabled className="px-4 py-2 bg-gray-100 text-gray-400 text-xs font-bold rounded-xl cursor-not-allowed">ไม่มีไฟล์</button>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Link href="/employees/create" className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 shadow-sm">ปิดหน้าต่าง</Link>
            </div>
          </div>
        </div>
      )}

      {activeMoveEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-orange-50">
              <h2 className="text-lg font-bold text-orange-800">ย้ายบริษัทสังกัด</h2>
              <Link href="/employees/create" className="text-gray-400 hover:text-red-500 transition-colors">ถ</Link>
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
                  {companies.map(c => (
                    <option key={c.id} value={c.id} disabled={c.id === activeMoveEmp.company_id}>
                      {c.company_name} {c.id === activeMoveEmp.company_id ? '(ปัจจุบัน)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                <Link href="/employees/create" className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100">ยกเลิก</Link>
                <button type="submit" className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-md">ยืนยันการย้าย</button>
              </div>
            </ApiActionForm>
          </div>
        </div>
      )}

      {activeDeleteEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 animate-in fade-in zoom-in-95 duration-200">
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
