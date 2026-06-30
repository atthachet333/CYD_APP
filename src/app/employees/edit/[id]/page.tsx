// src/app/employees/edit/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";

// 🟢 Array รายชื่อบริษัทที่กำหนดในโค้ด (เหมือนกับหน้า Create)
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

// 🚀 Server Action สำหรับอัปเดตข้อมูล
async function updateEmployee(formData: FormData) {
  "use server";

  const id = formData.get("id") as string;
  const company_name_val = formData.get("company_name_val") as string;
  if (!id || !company_name_val) throw new Error("ข้อมูลไม่ครบถ้วน");

  // 🟢 ระบบ Auto-Sync เหมือนหน้า Create
  let company = await prisma.companies.findFirst({
    where: { company_name: company_name_val }
  });

  if (!company) {
    company = await prisma.companies.create({
      data: { company_name: company_name_val }
    });
  }

  const company_id = company.id;
  const work_type_id = formData.get("work_type_id");

  const file = formData.get("main_document") as File | null;
  let fileNameToSave: string | undefined = undefined;

  if (file && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    fileNameToSave = file.name;

    const uploadDir = path.join(process.cwd(), "private_uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    await writeFile(path.join(uploadDir, fileNameToSave), buffer);
  }

  const dataToUpdate: any = {
    emp_code: (formData.get("emp_code") as string) || null,
    first_name_th: formData.get("first_name_th") as string,
    last_name_th: formData.get("last_name_th") as string,
    first_name_en: formData.get("first_name_en") as string,
    last_name_en: formData.get("last_name_en") as string,
    company_id: company_id, // 🟢 บันทึกด้วย ID ที่ผ่าน Auto-sync
    work_type_id: work_type_id ? Number(work_type_id) : null,
    debt_amount: Number(formData.get("debt_amount")) || 0,
    
    passport_number: formData.get("passport_number") as string || null,
    passport_expiry_date: formData.get("passport_expiry_date") ? new Date(formData.get("passport_expiry_date") as string) : null,
    
    visa_number: formData.get("visa_number") as string || null,
    visa_expiry_date: formData.get("visa_expiry_date") ? new Date(formData.get("visa_expiry_date") as string) : null,
    
    work_permit_number: formData.get("work_permit_number") as string || null,
    work_permit_expiry_date: formData.get("work_permit_expiry_date") ? new Date(formData.get("work_permit_expiry_date") as string) : null,
    
    ninety_day_report_date: formData.get("ninety_day_report_date") ? new Date(formData.get("ninety_day_report_date") as string) : null,
  };

  if (fileNameToSave) {
    dataToUpdate.document_file_name = fileNameToSave;
  }

  await prisma.employee_document_profiles.update({
    where: { id: Number(id) },
    data: dataToUpdate
  });

  redirect("/employees");
}

const formatDateForInput = (date: Date | null | undefined) => {
  if (!date) return "";
  return new Date(date).toISOString().split('T')[0];
};

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  
  const resolvedParams = await params;
  const employeeId = Number(resolvedParams.id);

  const employee = await prisma.employee_document_profiles.findUnique({
    where: { id: employeeId }
  });

  if (!employee) {
    redirect("/employees");
  }

  // ดึงชื่อบริษัทปัจจุบันเพื่อเอาไปเป็นค่าเริ่มต้นใน Dropdown
  const currentCompany = await prisma.companies.findUnique({
    where: { id: Number(employee.company_id) }
  });
  const defaultCompanyName = currentCompany?.company_name || "";

  return (
    <div className="font-sans text-gray-800 bg-[#f4f7fe] min-h-screen p-6 md:p-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden max-w-4xl mx-auto">
        
        <div className="bg-white border-b border-gray-100 p-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#111c44]">แก้ไขข้อมูลพนักงาน</h1>
          <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
            ID: {employee.id}
          </span>
        </div>
        
        <div className="p-6 md:p-8">
          <form action={updateEmployee} className="space-y-6 text-sm">
            <input type="hidden" name="id" value={employee.id} />

            <div>
              <label className="block font-bold text-gray-700 mb-1.5">รหัสพนักงาน</label>
              <input type="text" name="emp_code" defaultValue={employee.emp_code || ""} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">ชื่อภาษาไทย</label>
                <input type="text" name="first_name_th" defaultValue={employee.first_name_th || ""} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">นามสกุลภาษาไทย</label>
                <input type="text" name="last_name_th" defaultValue={employee.last_name_th || ""} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">ชื่อภาษาอังกฤษ</label>
                <input type="text" name="first_name_en" defaultValue={employee.first_name_en || ""} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">นามสกุลภาษาอังกฤษ</label>
                <input type="text" name="last_name_en" defaultValue={employee.last_name_en || ""} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">บริษัท <span className="text-red-500">*</span></label>
                <select name="company_name_val" defaultValue={defaultCompanyName} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                  <option value="">-- เลือกบริษัท --</option>
                  {/* 🟢 ดึงข้อมูลจาก Array ด้านบนมาทำตัวเลือก */}
                  {COMPANY_LIST.map((cName, idx) => (
                    <option key={idx} value={cName}>{cName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">ประเภทเวิร์ค</label>
                <select name="work_type_id" defaultValue={employee.work_type_id || ""} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                  <option value="">-- เลือกประเภทเวิร์ค --</option>
                  <option value="1">MOU</option>
                  <option value="2">มติ ครม. 11 พ.ย. 68</option>
                  <option value="3">มติ ครม. 2 ธ.ค. 68</option>
                  <option value="4">มติ ครม. 24 ก.ย. 67</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">ยอดค้างชำระ (บาท)</label>
                <input type="number" step="0.01" name="debt_amount" defaultValue={Number(employee.debt_amount) || 0} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>

            <div className="border border-blue-200 bg-blue-50/40 p-5 rounded-xl mb-6">
              <label className="block font-bold text-gray-800 mb-2">
                อัปโหลดเอกสารหลัก <span className="text-red-500 text-sm font-normal">(ชื่อไฟล์เดิมเท่านั้น ตาม รหัสพนักงาน)</span>
              </label>
              <input type="file" name="main_document" accept=".pdf, image/*" className="w-full text-sm bg-white border border-gray-200 rounded-lg p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors" />
            </div>

            <div className="border border-gray-200 p-5 rounded-xl bg-gray-50/50">
              <h3 className="font-bold text-gray-800 mb-4">ข้อมูลวันสำคัญ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">เลขพาสปอร์ต</label>
                  <input type="text" name="passport_number" defaultValue={employee.passport_number || ""} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none uppercase" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">วันหมดอายุพาสปอร์ต</label>
                  <input type="date" name="passport_expiry_date" defaultValue={formatDateForInput(employee.passport_expiry_date)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none" />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">เลขที่วีซ่า</label>
                  <input type="text" name="visa_number" defaultValue={employee.visa_number || ""} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none uppercase" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">วันหมดอายุวีซ่า</label>
                  <input type="date" name="visa_expiry_date" defaultValue={formatDateForInput(employee.visa_expiry_date)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none" />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">เลขใบอนุญาตทำงาน</label>
                  <input type="text" name="work_permit_number" defaultValue={employee.work_permit_number || ""} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none uppercase" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">วันหมดอายุใบอนุญาต</label>
                  <input type="date" name="work_permit_expiry_date" defaultValue={formatDateForInput(employee.work_permit_expiry_date)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1.5">วันรายงานตัว 90 วันล่าสุด</label>
                  <input type="date" name="ninety_day_report_date" defaultValue={formatDateForInput(employee.ninety_day_report_date)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center border-t border-gray-100 mt-6">
              <Link href="/employees" className="px-6 py-3 bg-white text-gray-600 border border-gray-300 font-bold rounded-lg hover:bg-gray-50 transition">
                ยกเลิก
              </Link>
              <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition">
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}