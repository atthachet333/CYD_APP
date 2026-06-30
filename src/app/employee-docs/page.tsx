import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// 1. Server Action: ฟังก์ชันบันทึกข้อมูลและอัปโหลดไฟล์
async function saveEmployeeProfile(formData: FormData) {
  "use server";

  const empId = formData.get("employee_id")?.toString() || "";
  const firstName = formData.get("first_name")?.toString() || "";
  const lastName = formData.get("last_name")?.toString() || "";
  const passportNo = formData.get("passport_no")?.toString() || "";

  // แปลงค่าวันที่
  const passportExpiry = formData.get("passport_expiry_date")?.toString();
  const visaExpiry = formData.get("visa_expiry_date")?.toString();
  const workPermitExpiry = formData.get("work_permit_expiry_date")?.toString();

  // ฟังก์ชันย่อยสำหรับจัดการอัปโหลดไฟล์เข้าโฟลเดอร์ public/uploads
  async function uploadFile(file: File | null, prefix: string) {
    if (!file || file.size === 0) return null;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // เก็บไฟล์ไว้นอก public เพื่อไม่ให้เปิด URL ตรงได้
    const uploadDir = path.join(process.cwd(), "private_uploads", "employee_docs");
    await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const fileName = `${prefix}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    // เก็บแค่ชื่อไฟล์ลง DB ไม่เก็บ /uploads/...
    return fileName;
  }

  // อัปโหลดไฟล์ต่างๆ
  const passportFilePath = await uploadFile(formData.get("passport_file") as File, "pass");
  const visaFilePath = await uploadFile(formData.get("visa_file") as File, "visa");

  // บันทึกลงฐานข้อมูลตาราง employee_document_profiles
  await prisma.employee_document_profiles.create({
    data: {
      employee_id: empId,
      first_name: firstName,
      last_name: lastName,
      passport_no: passportNo,
      passport_expiry_date: passportExpiry ? new Date(passportExpiry) : null,
      visa_expiry_date: visaExpiry ? new Date(visaExpiry) : null,
      work_permit_expiry_date: workPermitExpiry ? new Date(workPermitExpiry) : null,
      passport_file: passportFilePath,
      visa_file: visaFilePath,
    },
  });

  // บันทึกเสร็จให้เด้งกลับไปหน้าข้อมูลพนักงาน
  redirect("/employees");
}

// 2. Page Component: หน้าจอแสดงผลฟอร์ม
export default async function EmployeeDocsPage({
  searchParams,
}: {
  searchParams: { emp_id?: string };
}) {
  const empId = searchParams.emp_id;
  let employee = null;

  // ถ้ามีการส่ง emp_id มา (กดมาจากหน้าพนักงาน) ให้ดึงชื่อมาแสดงอัตโนมัติ
  if (empId) {
    employee = await prisma.employees.findUnique({
      where: { id: parseInt(empId) },
    });
  }

  // แยกชื่อ-นามสกุลจาก full_name ถ้ามี
  const nameParts = employee?.full_name ? employee.full_name.split(" ") : ["", ""];
  const defaultFirstName = nameParts[0] || "";
  const defaultLastName = nameParts.slice(1).join(" ") || "";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">แฟ้มประวัติและเอกสาร</h1>
            <p className="text-sm text-gray-500 mt-1">อัปโหลดไฟล์สแกนและบันทึกวันหมดอายุ</p>
          </div>
          <a href="/employees" className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
            &larr; กลับหน้าพนักงาน
          </a>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-800">ข้อมูลเอกสารประจำตัว</h3>
            <button type="button" className="bg-purple-50 text-purple-600 border border-purple-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-100 transition-colors">
              ✨ อ่านข้อมูลจากภาพอัตโนมัติ (OCR)
            </button>
          </div>

          {/* form action จะวิ่งไปที่ฟังก์ชัน saveEmployeeProfile อัตโนมัติ */}
          <form action={saveEmployeeProfile} className="space-y-6">
            <input type="hidden" name="employee_id" value={empId || ""} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อ <span className="text-red-500">*</span></label>
                <input type="text" name="first_name" defaultValue={defaultFirstName} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">นามสกุล</label>
                <input type="text" name="last_name" defaultValue={defaultLastName} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* ส่วนพาสปอร์ต */}
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h4 className="font-bold text-gray-800">หนังสือเดินทาง (Passport)</h4>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">เลขพาสปอร์ต</label>
                  <input type="text" name="passport_no" defaultValue={employee?.passport_no || ""} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">วันหมดอายุพาสปอร์ต</label>
                  <input type="date" name="passport_expiry_date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">ไฟล์สแกน (PDF/IMG)</label>
                  <input type="file" name="passport_file" accept=".pdf,image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
              </div>

              {/* ส่วนวีซ่า & ใบอนุญาตทำงาน */}
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h4 className="font-bold text-gray-800">วีซ่า & ใบอนุญาตทำงาน</h4>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">วันหมดอายุวีซ่า</label>
                  <input type="date" name="visa_expiry_date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">วันหมดอายุใบอนุญาตทำงาน (Work Permit)</label>
                  <input type="date" name="work_permit_expiry_date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">ไฟล์สแกนวีซ่า</label>
                  <input type="file" name="visa_file" accept=".pdf,image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm">
                บันทึกแฟ้มประวัติพนักงาน
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}