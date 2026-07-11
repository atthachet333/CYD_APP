// src/app/employees/edit/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ApiActionForm from "../../create/ApiActionForm";
import BackButton from "./BackButton"; // 🟢 Import ปุ่มย้อนกลับเข้ามา

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: EditPageProps) {
  // 1. ดึง ID จาก URL
  const resolvedParams = await params;
  const empId = Number(resolvedParams.id);

  if (isNaN(empId)) return notFound();

  // 2. ค้นหาข้อมูลพนักงานจากฐานข้อมูลด้วย ID
  const employee = await prisma.employee_document_profiles.findUnique({
    where: { id: empId },
  });

  // ถ้าไม่พบข้อมูลพนักงาน ให้โชว์หน้า 404
  if (!employee) return notFound();

  // ฟังก์ชันช่วยแปลงวันที่จาก Database ให้อยู่ในฟอร์แมต YYYY-MM-DD
  const formatDate = (dateValue: Date | null | undefined) => {
    if (!dateValue) return "";
    try {
      return new Date(dateValue).toISOString().split("T")[0];
    } catch (error) {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fe] p-4 font-sans text-gray-800 sm:p-6 md:p-8">
      
      {/* คลุมด้วย Container นี้เพื่อให้เนื้อหาทั้งหมดอยู่กึ่งกลางจอ */}
      <div className="max-w-5xl mx-auto">
        
        {/* Header ของหน้า */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-[#111c44]">ระบบจัดการเอกสาร</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            แก้ไขข้อมูลพนักงาน: {employee.first_name_th} {employee.last_name_th}
          </p>
        </div>

        {/* เริ่มต้นฟอร์ม */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
          <div className="p-6 md:p-8">
            <h2 className="text-xl font-extrabold text-[#111c44] mb-6 border-b border-gray-100 pb-4">
              แก้ไขข้อมูลพนักงาน (เอกสาร)
            </h2>

            <ApiActionForm endpoint="/api/employee/update" redirectTo="/employees" className="space-y-6 text-sm" successMessage="แก้ไขสำเร็จ">
              {/* ซ่อน ID ไว้ส่งไปกับ API */}
              <input type="hidden" name="id" value={employee.id} />
              <input type="hidden" name="company_id" value={employee.company_id || ""} />

              {/* 1. ข้อมูลทั่วไป */}
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">รหัสพนักงาน</label>
                <input
                  type="text"
                  name="emp_code"
                  defaultValue={employee.emp_code || ""}
                  placeholder="เช่น EMP001"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">ชื่อภาษาไทย</label>
                  <input
                    type="text"
                    name="first_name_th"
                    defaultValue={employee.first_name_th || ""}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">นามสกุลภาษาไทย</label>
                  <input
                    type="text"
                    name="last_name_th"
                    defaultValue={employee.last_name_th || ""}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">ชื่อภาษาอังกฤษ</label>
                  <input
                    type="text"
                    name="first_name_en"
                    defaultValue={employee.first_name_en || ""}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">นามสกุลภาษาอังกฤษ</label>
                  <input
                    type="text"
                    name="last_name_en"
                    defaultValue={employee.last_name_en || ""}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase bg-white transition-colors"
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">ยอดค้างชำระ (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="debt_amount"
                    defaultValue={employee.debt_amount ? Number(employee.debt_amount) : "0.00"}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">ประเภทเวิร์ค</label>
                  <select
                    name="work_type_id"
                    defaultValue={employee.work_type_id || ""}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white transition-colors text-gray-700"
                  >
                    <option value="">-- เลือกประเภทเวิร์ค --</option>
                    <option value="1">MOU</option>
                    <option value="2">มติ ครม. 11 พ.ย. 68</option>
                    <option value="3">มติ ครม. 2 ธ.ค. 68</option>
                    <option value="4">มติ ครม. 24 ก.ย. 67</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5">สิทธิรักษาสุขภาพ</label>
                <select
                  name="healthcare_rights"
                  defaultValue={employee.healthcare_rights || "ไม่มี"}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white transition-colors text-gray-700 md:w-1/2"
                >
                  <option value="ประกันสังคม">ประกันสังคม</option>
                  <option value="ใบประกันสุขภาพ">ใบประกันสุขภาพ</option>
                  <option value="ไม่มี">ไม่มี</option>
                </select>
              </div>

              {/* 2. อัปโหลดไฟล์ 4 ช่อง */}
              <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/40 p-4 sm:p-6">
                <h3 className="font-extrabold text-[#111c44] mb-5 text-base">
                  อัปเดตเอกสารประจำตัวพนักงาน <span className="text-gray-500 text-sm font-normal">(อัปโหลดทับไฟล์เดิมได้เลย)</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                    <label className="block font-bold text-gray-800 mb-2 text-xs">1. หนังสือเดินทาง (Passport - PP)</label>
                    <input
                      type="file"
                      name="passport_document"
                      accept=".pdf, image/*"
                      className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                    />
                  </div>

                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                    <label className="block font-bold text-gray-800 mb-2 text-xs">2. วีซ่า (Visa - VS)</label>
                    <input
                      type="file"
                      name="visa_document"
                      accept=".pdf, image/*"
                      className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                    />
                  </div>

                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                    <label className="block font-bold text-gray-800 mb-2 text-xs">3. ใบอนุญาตทำงาน (Work Permit)</label>
                    <input
                      type="file"
                      name="work_permit_document"
                      accept=".pdf, image/*"
                      className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                    />
                  </div>

                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                    <label className="block font-bold text-gray-800 mb-2 text-xs">4. รายงานตัว 90 วัน (90D)</label>
                    <input
                      type="file"
                      name="ninety_day_document"
                      accept=".pdf, image/*"
                      className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* 3. ข้อมูลวันสำคัญ */}
              <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50/50 p-4 sm:p-6">
                <h3 className="font-extrabold text-[#111c44] mb-5 text-base">ข้อมูลวันสำคัญ (แก้ไขเองได้)</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">เลขพาสปอร์ต</label>
                    <input
                      type="text"
                      name="passport_number"
                      defaultValue={employee.passport_number || ""}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl uppercase focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">วันหมดอายุพาสปอร์ต</label>
                    <input
                      type="date"
                      name="passport_expiry_date"
                      defaultValue={formatDate(employee.passport_expiry_date)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">เลขที่วีซ่า</label>
                    <input
                      type="text"
                      name="visa_number"
                      defaultValue={employee.visa_number || ""}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl uppercase focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">วันหมดอายุวีซ่า</label>
                    <input
                      type="date"
                      name="visa_expiry_date"
                      defaultValue={formatDate(employee.visa_expiry_date)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">เลขใบอนุญาตทำงาน</label>
                    <input
                      type="text"
                      name="work_permit_number"
                      defaultValue={employee.work_permit_number || ""}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl uppercase focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">วันหมดอายุใบอนุญาตทำงาน</label>
                    <input
                      type="date"
                      name="work_permit_expiry_date"
                      defaultValue={formatDate(employee.work_permit_expiry_date)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-gray-600"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">วันรายงานตัว 90 วันล่าสุด</label>
                    <input
                      type="date"
                      name="ninety_day_report_date"
                      defaultValue={formatDate(employee.ninety_day_report_date)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-gray-600 md:w-1/2"
                    />
                  </div>
                </div>
              </div>

              {/* 4. ปุ่ม Action บันทึก/ยกเลิก */}
              <div className="mt-8 flex flex-col-reverse items-stretch justify-end gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center">
                
                {/* 🟢 เรียกใช้งาน Component ปุ่มยกเลิกที่เราสร้างแยกไว้ */}
                <BackButton />

                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition active:scale-95 flex items-center space-x-2"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </ApiActionForm>
          </div>
        </div>
      </div>
    </div>
  );
}
