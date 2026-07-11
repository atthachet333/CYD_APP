import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { typedDocumentFileExists } from "@/lib/document-alerts";
import SecureDocumentButton from "@/components/SecureDocumentButton";
import ApiActionForm from "../../../../employees/create/ApiActionForm";
import BackButton from "./BackButton";

function dateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
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
  const documentCards = [
    {
      type: "passport",
      title: "Passport (PP)",
      numberLabel: "เลขหนังสือเดินทาง",
      numberName: "passport_number",
      numberValue: employee.passport_number,
      dateLabel: "วันหมดอายุหนังสือเดินทาง",
      dateName: "passport_expiry_date",
      dateValue: employee.passport_expiry_date,
      fileName: "passport_document",
      hasFile: typedDocumentFileExists(employee, employee.id, "passport", "passport_file"),
    },
    {
      type: "visa",
      title: "Visa (VS)",
      numberLabel: "เลขที่วีซ่า",
      numberName: "visa_number",
      numberValue: employee.visa_number,
      dateLabel: "วันหมดอายุวีซ่า",
      dateName: "visa_expiry_date",
      dateValue: employee.visa_expiry_date,
      fileName: "visa_document",
      hasFile: typedDocumentFileExists(employee, employee.id, "visa", "visa_file"),
    },
    {
      type: "work_permit",
      title: "Work Permit (WP)",
      numberLabel: "เลขใบอนุญาตทำงาน",
      numberName: "work_permit_number",
      numberValue: employee.work_permit_number,
      dateLabel: "วันหมดอายุใบอนุญาตทำงาน",
      dateName: "work_permit_expiry_date",
      dateValue: employee.work_permit_expiry_date,
      fileName: "work_permit_document",
      hasFile: typedDocumentFileExists(employee, employee.id, "work_permit", "work_permit_file"),
    },
    {
      type: "ninety_day",
      title: "90 Days",
      numberLabel: "เลขที่รายงานตัว 90 วัน",
      numberName: "ninety_day_number",
      numberValue: employee.ninety_day_number,
      dateLabel: "วันที่รายงานตัว 90 วัน",
      dateName: "ninety_day_report_date",
      dateValue: employee.ninety_day_report_date,
      fileName: "ninety_day_document",
      hasFile: typedDocumentFileExists(employee, employee.id, "ninety_day", "ninety_day_file"),
    },
  ] as const;

  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  const fileClass = "w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-bold file:text-blue-700 hover:file:bg-blue-100";

  return (
    <div className="min-h-screen bg-[#f4f7fe] p-4 font-sans text-gray-800 sm:p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-[#111c44]">แก้ไขข้อมูลพนักงาน</h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            {employee.first_name_th || employee.first_name_en || employee.emp_code || "-"} · {company?.company_name || "บริษัทของคุณ"}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="p-5 sm:p-6 md:p-8">
            <h2 className="mb-6 border-b border-gray-100 pb-4 text-xl font-extrabold text-[#111c44]">
              แก้ไขข้อมูลพนักงานและเอกสาร
            </h2>

            <ApiActionForm
              endpoint="/api/document-approvals/request"
              redirectTo="/company-dashboard"
              className="space-y-8 text-sm"
              successMessage="ส่งคำขอเรียบร้อยแล้ว กรุณารอผู้ดูแลระบบตรวจสอบ"
            >
              <input type="hidden" name="id" value={employee.id} />

              <section className="space-y-6">
                <div>
                  <label className="mb-1.5 block font-bold text-gray-700">รหัสพนักงาน</label>
                  <input type="text" value={employee.emp_code || ""} readOnly className={`${inputClass} bg-gray-50 font-bold text-gray-500`} />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block font-bold text-gray-700">ชื่อภาษาไทย</label>
                    <input name="first_name_th" defaultValue={employee.first_name_th || ""} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-bold text-gray-700">นามสกุลภาษาไทย</label>
                    <input name="last_name_th" defaultValue={employee.last_name_th || ""} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-bold text-gray-700">ชื่อภาษาอังกฤษ</label>
                    <input name="first_name_en" defaultValue={employee.first_name_en || ""} className={`${inputClass} uppercase`} />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-bold text-gray-700">นามสกุลภาษาอังกฤษ</label>
                    <input name="last_name_en" defaultValue={employee.last_name_en || ""} className={`${inputClass} uppercase`} />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block font-bold text-gray-700">สิทธิรักษาสุขภาพ</label>
                  <select name="healthcare_rights" defaultValue={employee.healthcare_rights || "ไม่มี"} className={`${inputClass} md:w-1/2`}>
                    <option value="ประกันสังคม">ประกันสังคม</option>
                    <option value="ใบประกันสุขภาพ">ใบประกันสุขภาพ</option>
                    <option value="ไม่มี">ไม่มี</option>
                  </select>
                </div>
              </section>

              <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 sm:p-6">
                <div className="mb-5">
                  <h3 className="text-base font-extrabold text-[#111c44]">เอกสารประจำตัวพนักงาน</h3>
                  <p className="mt-1 text-xs text-gray-500">กรอกข้อมูลหรือเลือกไฟล์ใหม่เฉพาะรายการที่ต้องการส่งให้ผู้ดูแลตรวจสอบ</p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {documentCards.map((document) => (
                    <article key={document.type} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <h4 className="font-extrabold text-[#111c44]">{document.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${document.hasFile ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
                            {document.hasFile ? "มีไฟล์เดิม" : "ยังไม่มีไฟล์"}
                          </span>
                          {document.hasFile && (
                            <SecureDocumentButton
                              employeeId={employee.id}
                              documentType={document.type}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                              ดูไฟล์เดิม
                            </SecureDocumentButton>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-gray-700">{document.numberLabel}</label>
                          <input name={document.numberName} defaultValue={document.numberValue || ""} className={`${inputClass} uppercase`} />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-gray-700">{document.dateLabel}</label>
                          <input type="date" name={document.dateName} defaultValue={dateInput(document.dateValue)} className={inputClass} />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-gray-700">เลือกไฟล์ใหม่</label>
                          <input type="file" name={document.fileName} accept=".pdf,.png,.jpg,.jpeg,.webp" className={fileClass} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center">
                <BackButton />
                <button type="submit" className="rounded-xl bg-blue-600 px-8 py-3 font-bold text-white shadow-md transition hover:bg-blue-700 active:scale-95">
                  ส่งคำขออนุมัติ
                </button>
              </div>
            </ApiActionForm>
          </div>
        </div>
      </div>
    </div>
  );
}
