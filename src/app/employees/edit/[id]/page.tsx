import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ApiActionForm from "../../create/ApiActionForm"; // ปรับ Path ให้ตรงกับไฟล์ ApiActionForm ในเครื่องคุณ

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const emp = await prisma.employee_document_profiles.findUnique({ where: { id: Number(id) } });

  if (!emp) redirect("/employees");

  return (
    <div className="p-8 bg-[#f4f7fe] min-h-screen">
      <div className="bg-white rounded-2xl p-8 shadow-sm border">
        <h1 className="text-xl font-bold mb-6">แก้ไขข้อมูล: {emp.first_name_th}</h1>
        
        {/* ใช้ฟอร์มตัวเดียวกับหน้า Create เพื่อให้กรอกได้เหมือนกันเป๊ะ */}
        <ApiActionForm endpoint="/api/employee/update" successMessage="แก้ไขสำเร็จ">
          <input type="hidden" name="id" value={emp.id} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <input type="text" name="emp_code" defaultValue={emp.emp_code || ""} placeholder="รหัสพนักงาน" className="border p-3 rounded-xl" />
            <input type="text" name="first_name_th" defaultValue={emp.first_name_th || ""} className="border p-3 rounded-xl" />
            <input type="text" name="last_name_th" defaultValue={emp.last_name_th || ""} className="border p-3 rounded-xl" />
          </div>

          {/* 4 ช่องอัปโหลดไฟล์ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-3 border rounded-xl"><label className="block text-xs font-bold">Passport (PP)</label><input type="file" name="passport_file" /></div>
            <div className="p-3 border rounded-xl"><label className="block text-xs font-bold">Visa (VS)</label><input type="file" name="visa_file" /></div>
            <div className="p-3 border rounded-xl"><label className="block text-xs font-bold">Work Permit</label><input type="file" name="work_permit_file" /></div>
            <div className="p-3 border rounded-xl"><label className="block text-xs font-bold">90 Days (90D)</label><input type="file" name="ninety_day_file" /></div>
          </div>

          <button type="submit" className="mt-6 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl">บันทึกการแก้ไข</button>
        </ApiActionForm>
      </div>
    </div>
  );
}