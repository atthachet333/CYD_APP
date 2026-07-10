import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ApiActionForm from "../../../../employees/create/ApiActionForm";
import BackButton from "./BackButton";

function dateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
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
  if (!Number.isInteger(employeeId) || employeeId <= 0) notFound();

  const employee = await prisma.employee_document_profiles.findFirst({
    where: { id: employeeId, company_id: companyId },
  });
  if (!employee) notFound();

  const company = await prisma.companies.findUnique({ where: { id: companyId } });

  return (
    <div className="font-sans text-gray-800 bg-[#f4f7fe] min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-[#111c44]">แก้ไขข้อมูลพนักงาน</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            {employee.first_name_th || employee.first_name_en || employee.emp_code || "-"} · {company?.company_name || "บริษัทของคุณ"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 md:p-8">
            <ApiActionForm endpoint="/api/employee/update" redirectTo="/company-dashboard" className="space-y-6 text-sm" successMessage="แก้ไขสำเร็จ">
              <input type="hidden" name="id" value={employee.id} />

              <div>
                <label className="block font-bold text-gray-700 mb-1.5">รหัสพนักงาน</label>
                <input
                  type="text"
                  value={employee.emp_code || ""}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input name="first_name_th" defaultValue={employee.first_name_th || ""} placeholder="ชื่อไทย" className="w-full px-4 py-3 border border-gray-200 rounded-xl" />
                <input name="last_name_th" defaultValue={employee.last_name_th || ""} placeholder="นามสกุลไทย" className="w-full px-4 py-3 border border-gray-200 rounded-xl" />
                <input name="first_name_en" defaultValue={employee.first_name_en || ""} placeholder="First name" className="w-full px-4 py-3 border border-gray-200 rounded-xl uppercase" />
                <input name="last_name_en" defaultValue={employee.last_name_en || ""} placeholder="Last name" className="w-full px-4 py-3 border border-gray-200 rounded-xl uppercase" />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5">สิทธิรักษาสุขภาพ</label>
                <select name="healthcare_rights" defaultValue={employee.healthcare_rights || "ไม่มี"} className="w-full md:w-1/2 px-4 py-3 border border-gray-200 rounded-xl bg-white">
                  <option value="ประกันสังคม">ประกันสังคม</option>
                  <option value="ใบประกันสุขภาพ">ใบประกันสุขภาพ</option>
                  <option value="ไม่มี">ไม่มี</option>
                </select>
              </div>

              <div className="border border-gray-200 p-6 rounded-2xl bg-gray-50/50">
                <h2 className="font-extrabold text-[#111c44] mb-5">ข้อมูลเอกสาร</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input name="passport_number" defaultValue={employee.passport_number || ""} placeholder="Passport No." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl uppercase bg-white" />
                  <input type="date" name="passport_expiry_date" defaultValue={dateInput(employee.passport_expiry_date)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white" />
                  <input name="visa_number" defaultValue={employee.visa_number || ""} placeholder="Visa No." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl uppercase bg-white" />
                  <input type="date" name="visa_expiry_date" defaultValue={dateInput(employee.visa_expiry_date)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white" />
                  <input name="work_permit_number" defaultValue={employee.work_permit_number || ""} placeholder="Work Permit No." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl uppercase bg-white" />
                  <input type="date" name="work_permit_expiry_date" defaultValue={dateInput(employee.work_permit_expiry_date)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white" />
                  <input name="ninety_day_number" defaultValue={employee.ninety_day_number || ""} placeholder="90 Days No." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl uppercase bg-white" />
                  <input type="date" name="ninety_day_report_date" defaultValue={dateInput(employee.ninety_day_report_date)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white" />
                </div>
              </div>

              <div className="border border-blue-200 bg-blue-50/40 p-6 rounded-2xl">
                <h2 className="font-extrabold text-[#111c44] mb-5">อัปโหลดเอกสาร</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="bg-white border border-gray-200 p-4 rounded-xl text-xs font-bold">Passport<input type="file" name="passport_document" accept=".pdf,.png,.jpg,.jpeg,.webp" className="block mt-2 w-full font-normal" /></label>
                  <label className="bg-white border border-gray-200 p-4 rounded-xl text-xs font-bold">Visa<input type="file" name="visa_document" accept=".pdf,.png,.jpg,.jpeg,.webp" className="block mt-2 w-full font-normal" /></label>
                  <label className="bg-white border border-gray-200 p-4 rounded-xl text-xs font-bold">Work Permit<input type="file" name="work_permit_document" accept=".pdf,.png,.jpg,.jpeg,.webp" className="block mt-2 w-full font-normal" /></label>
                  <label className="bg-white border border-gray-200 p-4 rounded-xl text-xs font-bold">90 Days<input type="file" name="ninety_day_document" accept=".pdf,.png,.jpg,.jpeg,.webp" className="block mt-2 w-full font-normal" /></label>
                </div>
              </div>

              <div className="pt-6 flex justify-end items-center border-t border-gray-200">
                <BackButton />
                <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition">
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
