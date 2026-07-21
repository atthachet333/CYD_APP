// src/app/employees/edit/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ApiActionForm from "../../create/ApiActionForm";
import BackButton from "./BackButton";
import CompanySelector from "../../create/CompanySelector";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: EditPageProps) {
  // 1. ดึง ID จาก URL
  const resolvedParams = await params;
  const empId = Number(resolvedParams.id);

  if (isNaN(empId)) return notFound();

  // 2. ค้นหาข้อมูลพนักงาน และ รายชื่อบริษัททั้งหมดมาเตรียมไว้
  const [employee, companies] = await Promise.all([
    prisma.employee_document_profiles.findUnique({
      where: { id: empId },
    }),
    prisma.companies.findMany({
      orderBy: { company_name: "asc" }
    })
  ]);

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
    <div className="min-h-screen bg-[#f4f7fe] p-4 sm:p-6 md:p-8 font-sans text-gray-800">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Header Section */}
        <div className="mb-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#111c44] tracking-tight">แก้ไขข้อมูลพนักงาน</h1>
            <p className="text-sm text-gray-500 mt-1">อัปเดตรายละเอียดประวัติ วันหมดอายุเอกสาร และไฟล์แนบ (6 ไฟล์)</p>
          </div>
          <BackButton />
        </div>

        {/* Form Section */}
        <ApiActionForm 
          endpoint="/api/employee/update"
          redirectTo="/employees"
          successMessage="บันทึกการแก้ไขข้อมูลพนักงานสำเร็จ"
        >
          {/* ส่ง ID ไปอัปเดตแบบ Hidden */}
          <input type="hidden" name="id" value={employee.id} />

          {/* 🌟 แบ่ง Layout เป็น 2 คอลัมน์ (ซ้าย-ขวา) เหมือนหน้าสร้างใหม่ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            
            {/* ================= ฝั่งซ้าย: ข้อมูลทั่วไป ================= */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <h2 className="text-lg font-bold text-[#1e3a8a] border-b border-gray-100 pb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600 shadow-sm"></span> ข้อมูลทั่วไปและสังกัด
              </h2>

              <div className="col-span-1 sm:col-span-2">
                <CompanySelector 
                  initialCompanies={companies.map(c => ({ id: c.id, company_name: c.company_name }))} 
                  defaultCompanyId={employee.company_id || ""}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">ยอดค้างชำระ (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="debt_amount"
                    defaultValue={Number(employee.debt_amount || 0).toFixed(2)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">ประเภทเวิร์ค</label>
                  <select
                    name="work_type_id"
                    defaultValue={employee.work_type_id || ""}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                  >
                    <option value="">-- เลือก --</option>
                    <option value="1">MOU</option>
                    <option value="2">มติ ครม. 11 พ.ย. 68</option>
                    <option value="3">มติ ครม. 2 ธ.ค. 68</option>
                    <option value="4">มติ ครม. 24 ก.ย. 67</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">สิทธิรักษาสุขภาพ</label>
                  <select
                    name="healthcare_rights"
                    defaultValue={employee.healthcare_rights || "ไม่มี"}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                  >
                    <option value="ประกันสังคม">ประกันสังคม</option>
                    <option value="ใบประกันสุขภาพ">ใบประกันสุขภาพ</option>
                    <option value="ไม่มี">ไม่มี</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">รหัสพนักงาน</label>
                <input
                  type="text"
                  name="emp_code"
                  defaultValue={employee.emp_code || ""}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">ชื่อ (ภาษาไทย) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="first_name_th"
                    defaultValue={employee.first_name_th || ""}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">นามสกุล (ภาษาไทย) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="last_name_th"
                    defaultValue={employee.last_name_th || ""}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">ชื่อ (ภาษาอังกฤษ)</label>
                  <input
                    type="text"
                    name="first_name_en"
                    defaultValue={employee.first_name_en || ""}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">นามสกุล (ภาษาอังกฤษ)</label>
                  <input
                    type="text"
                    name="last_name_en"
                    defaultValue={employee.last_name_en || ""}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* ================= ฝั่งขวา: เอกสาร วันหมดอายุ และ อัปโหลดไฟล์ 6 ไฟล์ ================= */}
            <div className="space-y-6 md:space-y-8">
              
              {/* ข้อมูลวันหมดอายุ */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h2 className="text-lg font-bold text-[#eab308] border-b border-gray-100 pb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></span> ข้อมูลเอกสารและวันหมดอายุ
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">หมายเลขพาสปอร์ต</label>
                    <input
                      type="text"
                      name="passport_number"
                      defaultValue={employee.passport_number || ""}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">วันหมดอายุพาสปอร์ต</label>
                    <input
                      type="date"
                      name="passport_expiry_date"
                      defaultValue={formatDate(employee.passport_expiry_date)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">หมายเลขวีซ่า</label>
                    <input
                      type="text"
                      name="visa_number"
                      defaultValue={employee.visa_number || ""}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">วันหมดอายุวีซ่า</label>
                    <input
                      type="date"
                      name="visa_expiry_date"
                      defaultValue={formatDate(employee.visa_expiry_date)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">หมายเลข Work Permit</label>
                    <input
                      type="text"
                      name="work_permit_number"
                      defaultValue={employee.work_permit_number || ""}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">วันหมดอายุ Work Permit</label>
                    <input
                      type="date"
                      name="work_permit_expiry_date"
                      defaultValue={formatDate(employee.work_permit_expiry_date)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-2">วันรายงานตัว 90 วันล่าสุด</label>
                    <input
                      type="date"
                      name="ninety_day_report_date"
                      defaultValue={formatDate(employee.ninety_day_report_date)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700 sm:w-1/2"
                    />
                  </div>
                </div>
              </div>

{/* ส่วนอัปโหลด 6 ไฟล์ */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h2 className="text-lg font-bold text-[#8b5cf6] border-b border-gray-100 pb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm"></span> ไฟล์เอกสารแนบ (อัปเดตไฟล์ใหม่)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. ใบเก็บอัตลักษณ์ */}
                  <div className="border border-gray-200 p-4 rounded-xl bg-gray-50 hover:border-purple-300 transition-all">
                    <label className="block text-xs font-bold text-gray-700 mb-2">1. ใบเก็บอัตลักษณ์</label>
                    <input 
                      type="file" 
                      name="main_document" 
                      accept=".pdf,.png,.jpg,.jpeg,.webp" 
                      className="w-full text-xs cursor-pointer file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors" 
                    />
                    {employee.document_file_name && (
                      <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> มีไฟล์เดิมแล้ว
                      </p>
                    )}
                  </div>

                  {/* 2. รูปถ่ายพนักงาน */}
                  <div className="border border-gray-200 p-4 rounded-xl bg-gray-50 hover:border-purple-300 transition-all">
                    <label className="block text-xs font-bold text-gray-700 mb-2">2. รูปถ่ายพนักงาน</label>
                    <input 
                      type="file" 
                      name="profile_picture" 
                      accept=".png,.jpg,.jpeg,.webp" 
                      className="w-full text-xs cursor-pointer file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors" 
                    />
                    {(employee as any).profile_picture_file && (
                      <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> มีรูปเดิมแล้ว
                      </p>
                    )}
                  </div>

                  {/* 3. สำเนาพาสปอร์ต */}
                  <div className="border border-gray-200 p-4 rounded-xl bg-gray-50 hover:border-purple-300 transition-all">
                    <label className="block text-xs font-bold text-gray-700 mb-2">3. สำเนาพาสปอร์ต</label>
                    <input 
                      type="file" 
                      name="passport_document" 
                      accept=".pdf,.png,.jpg,.jpeg,.webp" 
                      className="w-full text-xs cursor-pointer file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors" 
                    />
                    {(employee as any).passport_file && (
                      <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> มีไฟล์เดิมแล้ว
                      </p>
                    )}
                  </div>

                  {/* 4. สำเนาวีซ่า */}
                  <div className="border border-gray-200 p-4 rounded-xl bg-gray-50 hover:border-purple-300 transition-all">
                    <label className="block text-xs font-bold text-gray-700 mb-2">4. สำเนาวีซ่า</label>
                    <input 
                      type="file" 
                      name="visa_document" 
                      accept=".pdf,.png,.jpg,.jpeg,.webp" 
                      className="w-full text-xs cursor-pointer file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors" 
                    />
                    {(employee as any).visa_file && (
                      <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> มีไฟล์เดิมแล้ว
                      </p>
                    )}
                  </div>

                  {/* 5. สำเนา Work Permit */}
                  <div className="border border-gray-200 p-4 rounded-xl bg-gray-50 hover:border-purple-300 transition-all">
                    <label className="block text-xs font-bold text-gray-700 mb-2">5. สำเนา Work Permit</label>
                    <input 
                      type="file" 
                      name="work_permit_document" 
                      accept=".pdf,.png,.jpg,.jpeg,.webp" 
                      className="w-full text-xs cursor-pointer file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors" 
                    />
                    {(employee as any).work_permit_file && (
                      <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> มีไฟล์เดิมแล้ว
                      </p>
                    )}
                  </div>

                  {/* 6. ใบรายงานตัว 90 วัน */}
                  <div className="border border-gray-200 p-4 rounded-xl bg-gray-50 hover:border-purple-300 transition-all">
                    <label className="block text-xs font-bold text-gray-700 mb-2">6. ใบรายงานตัว 90 วัน</label>
                    <input 
                      type="file" 
                      name="ninety_day_document" 
                      accept=".pdf,.png,.jpg,.jpeg,.webp" 
                      className="w-full text-xs cursor-pointer file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors" 
                    />
                    {(employee as any).ninety_day_file && (
                      <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> มีไฟล์เดิมแล้ว
                      </p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ปุ่ม Action ด้านล่างสุด */}
          <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <BackButton />
            <button
              type="submit"
              className="px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 transition active:scale-95 flex items-center justify-center space-x-2"
            >
              <span>บันทึกการแก้ไขข้อมูล</span>
            </button>
          </div>
        </ApiActionForm>

      </div>
    </div>
  );
}