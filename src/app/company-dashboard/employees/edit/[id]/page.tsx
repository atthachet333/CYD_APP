// src/app/company-dashboard/employees/edit/[id]/page.tsx
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ApiActionForm from "../../../../employees/create/ApiActionForm";
import BackButton from "./BackButton";

function dateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
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

async function currentUser(session: any) {
  const username = session?.user?.username || session?.user?.name || "";
  const email = session?.user?.email || "";

  return prisma.users.findFirst({
    where: { OR: [{ username }, { email }, { full_name: session?.user?.name || "" }] },
    include: { roles: true },
  });
}

export default async function SpxEmployeeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");

  const user = await currentUser(session);
  const companyId = Number(user?.company_id || (session.user as any)?.companyId || 0);
  if (!companyId) redirect("/company-dashboard");

  const { id } = await params;
  const employeeId = Number(id);
  if (isNaN(employeeId)) return notFound();

  const employee = await prisma.employee_document_profiles.findFirst({
    where: { id: employeeId, company_id: companyId },
  });

  if (!employee) return notFound();

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-[#f8fafc] focus:bg-white font-medium text-gray-700 text-sm outline-none transition-all";
  const disabledInputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-100 font-bold text-gray-500 text-sm cursor-not-allowed";
  const fileClass = "w-full bg-white border border-gray-200 rounded-xl text-xs file:mr-2 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors cursor-pointer outline-none";

  // โครงสร้างประวัติการอัปโหลดไฟล์เช็คตรงจาก DB
  const documents = [
    {
      title: "1. ใบเก็บอัตลักษณ์",
      numberLabel: "หมายเลขเอกสารอัตลักษณ์ (ถ้ามี)",
      numberName: "main_document_number",
      numberValue: "",
      dateLabel: "วันที่เก็บอัตลักษณ์ (ถ้ามี)",
      dateName: "main_document_date",
      dateValue: null,
      fileName: "main_document",
      exists: employee.document_file_name ? true : false,
    },
    {
      title: "2. รูปถ่ายพนักงาน",
      numberLabel: "รหัสรูปถ่าย (ถ้ามี)",
      numberName: "profile_picture_number",
      numberValue: "",
      dateLabel: "วันที่ถ่ายรูป (ถ้ามี)",
      dateName: "profile_picture_date",
      dateValue: null,
      fileName: "profile_picture",
      exists: (employee as any).profile_picture_file ? true : false,
    },
    {
      title: "3. หนังสือเดินทาง (Passport)",
      numberLabel: "หมายเลขพาสปอร์ต",
      numberName: "passport_number",
      numberValue: employee.passport_number,
      dateLabel: "วันหมดอายุพาสปอร์ต",
      dateName: "passport_expiry_date",
      dateValue: employee.passport_expiry_date,
      fileName: "passport_document",
      exists: (employee as any).passport_file ? true : false,
    },
    {
      title: "4. วีซ่า (Visa)",
      numberLabel: "หมายเลขวีซ่า",
      numberName: "visa_number",
      numberValue: employee.visa_number,
      dateLabel: "วันหมดอายุวีซ่า",
      dateName: "visa_expiry_date",
      dateValue: employee.visa_expiry_date,
      fileName: "visa_document",
      exists: (employee as any).visa_file ? true : false,
    },
    {
      title: "5. ใบอนุญาตทำงาน (Work Permit)",
      numberLabel: "หมายเลข Work Permit",
      numberName: "work_permit_number",
      numberValue: employee.work_permit_number,
      dateLabel: "วันหมดอายุ Work Permit",
      dateName: "work_permit_expiry_date",
      dateValue: employee.work_permit_expiry_date,
      fileName: "work_permit_document",
      exists: (employee as any).work_permit_file ? true : false,
    },
    {
      title: "6. รายงานตัว 90 วัน (90 Days Report)",
      numberLabel: "หมายเลขรายงานตัว 90 วัน (ถ้ามี)",
      numberName: "ninety_day_number",
      numberValue: "",
      dateLabel: "วันรายงานตัว 90 วันล่าสุด",
      dateName: "ninety_day_report_date",
      dateValue: employee.ninety_day_report_date,
      fileName: "ninety_day_document",
      exists: (employee as any).ninety_day_file ? true : false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fe] p-4 sm:p-6 md:p-8 font-sans text-gray-800">
      <div className="max-w-[1450px] mx-auto">
        
        {/* Header Section */}
        <div className="mb-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:shadow-md">
          <div>
            <h1 className="text-2xl font-extrabold text-[#111c44] tracking-tight">แก้ไขข้อมูลพนักงาน (ส่งคำขออนุมัติ)</h1>
            <p className="text-sm text-gray-500 mt-1">อัปเดตรายละเอียดประวัติแบบครบถ้วน เลือกประเภทงาน และส่งไฟล์แนบตรวจสอบอนุมัติ</p>
          </div>
          <BackButton fallbackHref="/company-dashboard" />
        </div>

        {/* ฟอร์มจัดการหลัก */}
        <ApiActionForm 
          endpoint="/api/spx/employee/edit" 
          redirectTo="/company-dashboard" 
          successMessage="ส่งคำขออนุมัติแก้ไขข้อมูลสำเร็จแล้ว"
        >
          <input type="hidden" name="id" value={employee.id} />

          {/* Layout 2 ฝั่ง ซ้าย-ขวา แบบรูปหน้าลงทะเบียนหลักเป๊ะๆ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">
            
            {/* ========================================================
                👉 ฝั่งซ้าย: ข้อมูลตัวหนังสือทั้งหมด (อัปเกรดข้อมูลทั่วไปให้เยอะและแน่นขึ้น)
                ======================================================== */}
            <div className="space-y-6 md:space-y-8">
              
              {/* กล่องย่อยที่ 1: ข้อมูลประวัติทั่วไปของพนักงาน (เพิ่มฟิลด์จุใจ) */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6 transition-all hover:shadow-md">
                <h2 className="text-base font-bold text-[#1e3a8a] border-b border-gray-100 pb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm"></span> ข้อมูลทั่วไปและประวัติพนักงาน
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">รหัสพนักงาน</label>
                    <input disabled value={employee.emp_code || "-"} className={disabledInputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">แก้ไขประเภทเวิร์ค</label>
                    <select name="work_type_id" defaultValue={employee.work_type_id || ""} className={inputClass}>
                      <option value="">-- เลือกประเภทเวิร์ค --</option>
                      <option value="1">MOU</option>
                      <option value="2">มติ ครม. 11 พ.ย. 68</option>
                      <option value="3">มติ ครม. 2 ธ.ค. 68</option>
                      <option value="4">มติ ครม. 24 ก.ย. 67</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">สิทธิรักษาสุขภาพ</label>
                    <select name="healthcare_rights" defaultValue={employee.healthcare_rights || "ไม่มี"} className={inputClass}>
                      <option value="ประกันสังคม">ประกันสังคม</option>
                      <option value="ใบประกันสุขภาพ">ใบประกันสุขภาพ</option>
                      <option value="ไม่มี">ไม่มี</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">ชื่อ (ภาษาไทย)</label>
                    <input disabled value={employee.first_name_th || "-"} className={disabledInputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">นามสกุล (ภาษาไทย)</label>
                    <input disabled value={employee.last_name_th || "-"} className={disabledInputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">ชื่อ (ภาษาอังกฤษ)</label>
                    <input disabled value={employee.first_name_en || "-"} className={disabledInputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">นามสกุล (ภาษาอังกฤษ)</label>
                    <input disabled value={employee.last_name_en || "-"} className={disabledInputClass} />
                  </div>
                </div>

                {/* 🟢 ส่วนรายละเอียดที่เพิ่มเข้ามาใหม่ให้ข้อมูลแน่นขึ้น */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-50">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">ชื่อเล่น / สัญชาติ</label>
                    <p className="text-sm font-semibold text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                      { (employee as any).nickname || "-" } / { (employee as any).nationality || "ต่างด้าว" }
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">ยอดค้างชำระปัจจุบัน</label>
                    <p className="text-sm font-bold text-red-600 bg-red-50/50 px-3 py-2 rounded-lg border border-red-100">
                      { Number(employee.debt_amount || 0).toLocaleString() } บาท
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">วันที่ลงทะเบียนในระบบ</label>
                    <p className="text-xs font-semibold text-gray-700 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100 break-words">
                      { formatThaiDate(employee.created_at) }
                    </p>
                  </div>
                </div>
              </div>

              {/* กล่องย่อยที่ 2: ส่วนพิมพ์ระบุรายละเอียดหมายเลขและวันที่ของทั้ง 6 เอกสาร */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-5 transition-all hover:shadow-md">
                <h2 className="text-base font-bold text-[#eab308] border-b border-gray-100 pb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm"></span> กรอกรายละเอียดหมายเลขและวันหมดอายุ
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/40 p-4 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">หมายเลขพาสปอร์ต</label>
                    <input name="passport_number" defaultValue={employee.passport_number || ""} className={`${inputClass} uppercase`} placeholder="ระบุเลขพาสปอร์ต..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">วันหมดอายุพาสปอร์ต</label>
                    <input type="date" name="passport_expiry_date" defaultValue={dateInput(employee.passport_expiry_date)} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/40 p-4 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">หมายเลขวีซ่า</label>
                    <input name="visa_number" defaultValue={employee.visa_number || ""} className={`${inputClass} uppercase`} placeholder="ระบุเลขวีซ่า..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">วันหมดอายุวีซ่า</label>
                    <input type="date" name="visa_expiry_date" defaultValue={dateInput(employee.visa_expiry_date)} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/40 p-4 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">หมายเลข Work Permit</label>
                    <input name="work_permit_number" defaultValue={employee.work_permit_number || ""} className={`${inputClass} uppercase`} placeholder="ระบุเลข Work Permit..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">วันหมดอายุ Work Permit</label>
                    <input type="date" name="work_permit_expiry_date" defaultValue={dateInput(employee.work_permit_expiry_date)} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/40 p-4 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">หมายเลขรายงานตัว 90 วัน (ถ้ามี)</label>
                    <input name="ninety_day_number" defaultValue="" className={`${inputClass} uppercase`} placeholder="ระบุเลขรายงานตัว..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">วันรายงานตัว 90 วันล่าสุด</label>
                    <input type="date" name="ninety_day_report_date" defaultValue={dateInput(employee.ninety_day_report_date)} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/40 p-4 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">หมายเลขเอกสารอัตลักษณ์ (ถ้ามี)</label>
                    <input name="main_document_number" defaultValue="" className={`${inputClass} uppercase`} placeholder="ระบุหมายเลข..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">วันที่เก็บอัตลักษณ์ (ถ้ามี)</label>
                    <input type="date" name="main_document_date" defaultValue="" className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/40 p-4 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">รหัสรูปถ่าย (ถ้ามี)</label>
                    <input name="profile_picture_number" defaultValue="" className={`${inputClass} uppercase`} placeholder="ระบุรหัสรูปถ่าย..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">วันที่ถ่ายรูป (ถ้ามี)</label>
                    <input type="date" name="profile_picture_date" defaultValue="" className={inputClass} />
                  </div>
                </div>
              </div>

            </div>

            {/* ========================================================
                👉 ฝั่งขวา: กล่องสำหรับกดเลือกอัปโหลดไฟล์แนบแยกต่างหาก (รวม 6 ไฟล์)
                ======================================================== */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6 transition-all hover:shadow-md self-start">
              <h2 className="text-base font-bold text-[#8b5cf6] border-b border-gray-100 pb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm"></span> อัปโหลดไฟล์เอกสารแนบประจำตัว (รวมทั้งหมด 6 ไฟล์)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.map((doc, idx) => (
                  <div key={idx} className="p-4 border border-gray-100 bg-[#f8fafc] rounded-xl hover:border-purple-300 hover:bg-white transition-all flex flex-col justify-between min-h-[115px] shadow-sm">
                    <div>
                      <div className="flex justify-between items-center mb-2.5">
                        <label className="block text-xs font-extrabold text-gray-700 tracking-tight">{doc.title}</label>
                        {doc.exists ? (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md border border-green-200/60 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span> มีไฟล์เดิม
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                            ไม่มีไฟล์
                          </span>
                        )}
                      </div>
                      <input type="file" name={doc.fileName} accept=".pdf,.png,.jpg,.jpeg,.webp" className={fileClass} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ปุ่ม Action ด้านล่างสุด */}
          <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-gray-100 pt-6">
            <BackButton fallbackHref="/company-dashboard" />
            <button
              type="submit"
              className="px-10 py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 transition active:scale-95 flex items-center justify-center"
            >
              ส่งคำขออนุมัติแก้ไข
            </button>
          </div>
        </ApiActionForm>

      </div>
    </div>
  );
}