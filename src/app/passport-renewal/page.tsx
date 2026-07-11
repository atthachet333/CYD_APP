import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { typedDocumentFileExists } from "@/lib/document-alerts";
import PassportRenewalClient from "./PassportRenewalClient";

const INTERNAL_ROLES = new Set(["ADMIN", "STAFF", "SUPERADMIN"]);

async function currentUser(session: any) {
  const username = session?.user?.username || session?.user?.name || "";
  const email = session?.user?.email || "";

  return prisma.users.findFirst({
    where: { OR: [{ username }, { email }, { full_name: session?.user?.name || "" }] },
    include: { roles: true },
  });
}

function daysRemaining(value: Date | null) {
  if (!value) return null;
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function isoDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function cleanText(value: string | null | undefined) {
  return value?.trim() || null;
}

export default async function PassportRenewalPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");

  const user = await currentUser(session);
  const role = String(user?.roles?.name || (session.user as any)?.role || "").toUpperCase();
  if (!INTERNAL_ROLES.has(role)) redirect("/company-dashboard");

  const profiles = await prisma.employee_document_profiles.findMany({
    orderBy: [{ passport_expiry_date: "asc" }, { created_at: "desc" }],
    select: {
      id: true,
      emp_code: true,
      first_name: true,
      last_name: true,
      first_name_th: true,
      last_name_th: true,
      first_name_en: true,
      last_name_en: true,
      passport_number: true,
      passport_no: true,
      passport_expiry_date: true,
      passport_file: true,
    },
  });

  const summary = { total: profiles.length, expiringSoon: 0, overdue: 0, noData: 0 };

  for (const profile of profiles) {
    const days = daysRemaining(profile.passport_expiry_date);
    if (days === null) summary.noData++;
    else if (days < 0) summary.overdue++;
    else if (days <= 7) summary.expiringSoon++;
  }

  const employees = profiles.map((profile) => ({
    id: profile.id,
    emp_code: profile.emp_code,
    employeeName:
      `${profile.first_name_th || profile.first_name_en || profile.first_name || ""} ${profile.last_name_th || profile.last_name_en || profile.last_name || ""}`.trim() ||
      profile.emp_code ||
      `employee-${profile.id}`,
    passport_number: cleanText(profile.passport_number),
    passport_no: cleanText(profile.passport_no),
    passport_expiry_date: isoDate(profile.passport_expiry_date),
    has_passport_file: typedDocumentFileExists(profile, profile.id, "passport", "passport_file"),
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">แจ้งเตือนต่อพาสปอร์ต</h1>
        <p className="text-sm text-gray-500 mt-1">รายการหนังสือเดินทางที่ใกล้หมดอายุ และบันทึกการต่อเอกสารจากฐานข้อมูลจริง</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-[13px] font-semibold text-gray-500 mb-2">ทั้งหมด</div>
          <div className="text-3xl font-bold text-[#0f2b6f]">{summary.total}</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-[13px] font-semibold text-gray-500 mb-2">ใกล้หมดอายุ (7 วัน)</div>
          <div className="text-3xl font-bold text-[#c25e00]">{summary.expiringSoon}</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-[13px] font-semibold text-gray-500 mb-2">หมดอายุแล้ว</div>
          <div className="text-3xl font-bold text-[#b91c1c]">{summary.overdue}</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-[13px] font-semibold text-gray-500 mb-2">ยังไม่มีข้อมูล</div>
          <div className="text-3xl font-bold text-[#64748b]">{summary.noData}</div>
        </div>
      </div>

      <PassportRenewalClient employees={employees} />
    </div>
  );
}
