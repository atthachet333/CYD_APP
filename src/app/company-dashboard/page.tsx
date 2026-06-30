// src/app/company-dashboard/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SpxRegistrationSection from "./SpxRegistrationSection";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ deleteId?: string }>;
}

function documentHref(documentFileName: string) {
  if (/^https?:\/\//i.test(documentFileName) || documentFileName.startsWith("/")) {
    return documentFileName;
  }
  return `/api/documents/${encodeURIComponent(documentFileName)}`;
}

// 🟢 เพิ่ม Server Action สำหรับการลบข้อมูล (เมื่อกดยืนยันใน Popup)
async function deleteEmployeeAction(formData: FormData) {
  "use server";

  const id = formData.get("id");

  if (id) {
    await prisma.employee_document_profiles.delete({
      where: { id: Number(id) },
    });
  }

  // สั่ง redirect กลับมาหน้าเดิมเพื่อล้างค่า ?deleteId ออกจาก URL และรีเฟรชข้อมูล
  redirect("/company-dashboard");
}

export default async function CompanyDashboardPage({ searchParams }: PageProps) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  // ดึงค่าจากเซสชันโดยตรง
  const sessionUsername = (session.user as any)?.username || "NO_MATCH_USER";
  const sessionEmail = session.user?.email || "NO_MATCH_EMAIL";
  const sessionName = session.user?.name || "NO_MATCH_NAME";

  // ค้นหาผู้ใช้งาน
  const dbUser = (await prisma.users.findFirst({
    where: {
      OR: [
        { username: sessionUsername },
        { email: sessionEmail },
        { full_name: sessionName },
      ],
    },
  })) as any;

  const userCompanyId =
    dbUser?.company_id || (session.user as any)?.companyId || null;

  const searchCompanyId = userCompanyId ? Number(userCompanyId) : null;

  let company = null;
  let employees: any[] = [];

  if (searchCompanyId && !isNaN(searchCompanyId)) {
    company = await prisma.companies.findUnique({
      where: { id: searchCompanyId },
    });

    // ดึงข้อมูลพนักงานเฉพาะที่ company_id ตรงกับของผู้ใช้งาน
    employees = await prisma.employee_document_profiles.findMany({
      where: { company_id: searchCompanyId },
      orderBy: { created_at: "desc" },
    });
  }

  const totalEmployees = employees.length;

  // 🟢 อ่านค่า URL Param เพื่อเปิด Popup ลบ
  const resolvedSearchParams = await searchParams;
  const deleteId = resolvedSearchParams?.deleteId;

  const activeDeleteEmp = deleteId
    ? employees.find((e) => e.id.toString() === deleteId)
    : null;

  // ==========================================
  // ⚡️ ลอจิกคำนวณสถิติวันหมดอายุ
  // ==========================================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);
  in30Days.setHours(23, 59, 59, 999);

  let passportExpiringSoon = 0;
  let passportExpired = 0;
  let visaExpiringSoon = 0;
  let visaExpired = 0;
  let wpExpiringSoon = 0;
  let wpExpired = 0;
  let ninetyExpiringSoon = 0;
  let ninetyExpired = 0;

  let totalExpiringSoon = 0;
  let totalExpired = 0;

  employees.forEach((emp) => {
    let isAnyExpiringSoon = false;
    let isAnyExpired = false;

    const checkExpiry = (dateValue: Date | null | undefined) => {
      if (!dateValue) return { expired: false, soon: false };

      const d = new Date(dateValue);
      d.setHours(0, 0, 0, 0);

      const expired = d < today;
      const soon = d >= today && d <= in30Days;

      return { expired, soon };
    };

    const pp = checkExpiry(emp.passport_expiry_date);
    if (pp.expired) {
      passportExpired++;
      isAnyExpired = true;
    } else if (pp.soon) {
      passportExpiringSoon++;
      isAnyExpiringSoon = true;
    }

    const vi = checkExpiry(emp.visa_expiry_date);
    if (vi.expired) {
      visaExpired++;
      isAnyExpired = true;
    } else if (vi.soon) {
      visaExpiringSoon++;
      isAnyExpiringSoon = true;
    }

    const wp = checkExpiry(emp.work_permit_expiry_date);
    if (wp.expired) {
      wpExpired++;
      isAnyExpired = true;
    } else if (wp.soon) {
      wpExpiringSoon++;
      isAnyExpiringSoon = true;
    }

    const n90 = checkExpiry(emp.ninety_day_report_date);
    if (n90.expired) ninetyExpired++;
    if (n90.soon) ninetyExpiringSoon++;

    if (isAnyExpired) {
      totalExpired++;
    } else if (isAnyExpiringSoon) {
      totalExpiringSoon++;
    }
  });

  return (
    <div className="font-sans text-gray-800 bg-[#f4f7fe] min-h-screen -m-8 p-8 relative">
      {/* แบนเนอร์สรุปภาพรวมบริษัท */}
      <div className="bg-[#1e3a8a] text-white p-8 rounded-2xl shadow-md mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="mb-6 md:mb-0">
          <span className="bg-white/20 text-blue-100 text-[11px] font-bold px-3 py-1.5 rounded-full tracking-wide">
            ภาพรวมเอกสารบริษัท
          </span>

          <h1 className="text-3xl font-extrabold mt-4 mb-2 tracking-wide">
            สรุปภาพรวมบริษัท
          </h1>

          <p className="text-blue-200/80 text-sm max-w-xl leading-relaxed">
            ติดตามสถานะเอกสารของพนักงานในบริษัทจากฐานข้อมูลจริงในระบบ
            พร้อมเมนูจัดการไฟล์ที่เกี่ยวข้องได้จากหน้าเดียว
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="bg-white text-[#1e3a8a] font-extrabold px-6 py-2.5 rounded-full text-[13px] shadow-sm flex items-center justify-center">
              บริษัท:{" "}
              {company?.company_name || dbUser?.full_name || "ไม่พบข้อมูลบริษัท"}
            </div>

            <div className="bg-[#3b82f6] text-white font-bold px-6 py-2.5 rounded-full text-[13px] shadow-sm flex items-center justify-center">
              แสดงเฉพาะบริษัทของคุณ
            </div>
          </div>

          <SpxRegistrationSection
            companyName={company?.company_name || dbUser?.full_name || ""}
            companyId={searchCompanyId || 0}
          />
        </div>

        {/* กล่องค้นหาพนักงาน */}
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20 w-full md:w-80 shadow-inner">
          <p className="text-sm font-bold mb-3 text-white">ค้นหาพนักงาน</p>

          <input
            type="text"
            placeholder="ชื่อ, นามสกุล, รหัสพนักงาน"
            className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4 shadow-sm font-semibold"
          />

          <button className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-3 rounded-xl text-sm transition-all shadow-sm">
            อัปเดตข้อมูล
          </button>
        </div>
      </div>

      {/* สถิติภาพรวมตัวเลข */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[
          {
            title: "จำนวนพนักงาน",
            value: totalEmployees,
            desc: "ตามบัญชีที่บันทึกอยู่ตอนนี้",
          },
          {
            title: "ใกล้หมดอายุ",
            value: totalExpiringSoon,
            desc: "เอกสารที่คาดว่าจะหมดอายุ in 30 วัน",
          },
          {
            title: "หมดอายุแล้ว",
            value: totalExpired,
            desc: "ต้องเร่งดำเนินการต่ออายุ",
          },
          {
            title: "90 วันใกล้ครบกำหนด",
            value: ninetyExpiringSoon,
            desc: "ครบกำหนดรายงานตัวใน 30 วัน",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-center min-h-[140px]"
          >
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#f0f4ff] rounded-full opacity-70 pointer-events-none"></div>

            <p className="text-xs font-bold text-gray-400 mb-2 relative z-10">
              {item.title}
            </p>

            <p className="text-4xl font-extrabold text-[#1e3a8a] mb-2 relative z-10">
              {item.value}
            </p>

            <p className="text-[11px] text-gray-400 relative z-10">
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* ตารางรายชื่อพนักงาน */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-50 bg-white">
          <h2 className="text-lg font-extrabold text-[#1e3a8a]">
            รายชื่อบุคคล
          </h2>
          <p className="text-xs font-medium text-gray-400 mt-0.5">
            รายการพนักงานพร้อมวันสำคัญของเอกสารและปุ่มเปิดดูไฟล์ในระบบ
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-gray-500 bg-gray-50/50 border-b border-gray-100 text-[12px]">
                <th className="p-4 font-bold">รหัสพนักงาน</th>
                <th className="p-4 font-bold">ชื่อ-นามสกุล (TH)</th>
                <th className="p-4 font-bold">ชื่อ-นามสกุล (EN)</th>
                <th className="p-4 font-bold">พาสปอร์ตหมดอายุ</th>
                <th className="p-4 font-bold">วีซ่าหมดอายุ</th>
                <th className="p-4 font-bold">ใบอนุญาตทำงานหมดอายุ</th>
                <th className="p-4 font-bold">90 วันล่าสุด</th>

                {/* ✅ เพิ่มหัวตารางสิทธิรักษาสุขภาพ */}
                <th className="p-4 font-bold">สิทธิรักษาสุขภาพ</th>

                <th className="p-4 font-bold text-center">จัดการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50 text-[13px]">
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-blue-50/20 transition-colors"
                >
                  <td className="p-4 text-gray-500 font-medium">
                    {emp.emp_code || "-"}
                  </td>

                  <td className="p-4 font-bold text-gray-700">
                    {emp.first_name_th || emp.first_name || "-"}{" "}
                    {emp.last_name_th || emp.last_name || ""}
                  </td>

                  <td className="p-4 uppercase text-gray-500 text-[11px] font-medium">
                    {emp.first_name_en || "-"} {emp.last_name_en || ""}
                  </td>

                  <td className="p-4 text-gray-600">
                    {emp.passport_expiry_date
                      ? new Date(emp.passport_expiry_date).toLocaleDateString(
                        "th-TH"
                      )
                      : "-"}
                  </td>

                  <td className="p-4 text-gray-600">
                    {emp.visa_expiry_date
                      ? new Date(emp.visa_expiry_date).toLocaleDateString(
                        "th-TH"
                      )
                      : "-"}
                  </td>

                  <td className="p-4 text-gray-600">
                    {emp.work_permit_expiry_date
                      ? new Date(emp.work_permit_expiry_date).toLocaleDateString(
                        "th-TH"
                      )
                      : "-"}
                  </td>

                  <td className="p-4 text-gray-600">
                    {emp.ninety_day_report_date
                      ? new Date(emp.ninety_day_report_date).toLocaleDateString(
                        "th-TH"
                      )
                      : "-"}
                  </td>

                  {/* ✅ เพิ่มการดึงข้อมูลสิทธิรักษาสุขภาพ */}
                  <td className="p-4">
                    {emp.healthcare_rights && emp.healthcare_rights !== "ไม่มี" ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {emp.healthcare_rights}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-600 border border-red-100">
                        ไม่มี
                      </span>
                    )}
                  </td>

                  <td className="p-4 flex justify-center items-center space-x-2">
                    {/* ปุ่มดูเอกสาร */}
                    {emp.document_file_name || emp.emp_code ? (
                      <a
                        href={documentHref(
                          emp.document_file_name || `${emp.emp_code}.pdf`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1.5 border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 hover:text-purple-800 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>

                        <span>ดูเอกสาร</span>
                      </a>
                    ) : (
                      <span className="text-gray-400 text-[11px] italic">
                        ไม่มีเอกสาร
                      </span>
                    )}

                    {/* 🟢 เปลี่ยนเป็นปุ่มเปิด Popup ยืนยันการลบแทน */}
                    <Link
                      href={`?deleteId=${emp.id}`}
                      scroll={false}
                      className="flex items-center space-x-1.5 border border-red-200 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>

                      <span>ลบ</span>
                    </Link>
                  </td>
                </tr>
              ))}

              {employees.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="p-10 text-center text-gray-400 font-medium bg-gray-50/50"
                  >
                    ไม่พบข้อมูลพนักงานในระบบสำหรับบริษัทนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================== POPUPS (เพิ่ม Popup ลบ) ===================== */}
      {activeDeleteEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-black text-gray-800 mb-2">
              ยืนยันการลบ?
            </h2>

            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              คุณต้องการลบข้อมูลของ <br />
              <span className="font-bold text-red-500 text-base">
                {activeDeleteEmp.first_name_th} {activeDeleteEmp.last_name_th}
              </span>
              <br /> ใช่หรือไม่?
            </p>

            <form
              action={deleteEmployeeAction}
              className="flex gap-3 justify-center"
            >
              <input type="hidden" name="id" value={activeDeleteEmp.id} />

              <Link
                href="/company-dashboard"
                scroll={false}
                className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </Link>

              <button
                type="submit"
                className="flex-1 px-5 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:bg-red-700 transition-colors"
              >
                ลบข้อมูล
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}