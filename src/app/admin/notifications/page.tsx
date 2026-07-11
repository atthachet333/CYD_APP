import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NotificationClient from "./NotificationClient";
import DocumentExpiryNotificationSection from "@/components/DocumentExpiryNotificationSection";
import { buildDocumentExpiryAlerts } from "@/lib/document-alerts";

export default async function NotificationsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const sessionName = session.user?.name || "";
  const sessionEmail = session.user?.email || "";
  const sessionUsername = (session.user as any)?.username || "";
  const dbUser = await prisma.users.findFirst({
    where: {
      OR: [
        { username: sessionUsername },
        { email: sessionEmail },
        { full_name: sessionName },
      ],
    },
    include: { roles: true },
  });
  const role = String(dbUser?.roles?.name || (session.user as any)?.role || "").toUpperCase();

  if (!["ADMIN", "STAFF", "SUPERADMIN"].includes(role)) {
    redirect("/company-dashboard");
  }

  // ดึงข้อมูลการแจ้งเตือนทั้งหมด พร้อมดึงชื่อ user ที่เป็นเจ้าของการแจ้งเตือนนั้น
  const notifications = await prisma.notifications.findMany({
    include: {
      users: {
        select: {
          full_name: true,
          username: true
        }
      }
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  // Map ข้อมูลให้เรียกใช้งานง่ายขึ้นใน Client Component
  const mappedNotifications = notifications.map((noti) => ({
    id: noti.id,
    title: noti.title,
    body: noti.body,
    is_read: noti.is_read,
    created_at: noti.created_at.toISOString(),
    recipientName: noti.users?.full_name || noti.users?.username || 'ผู้ใช้ทั่วไป (ไม่ระบุตัวตน)',
  }));

  const employees = await prisma.employee_document_profiles.findMany({
    orderBy: { created_at: "desc" },
  });
  const companies = await prisma.companies.findMany({
    select: { id: true, company_name: true },
  });
  const companyNameById = new Map(companies.map((company) => [company.id, company.company_name]));
  const documentExpiryAlerts = buildDocumentExpiryAlerts(employees, companyNameById);

  return (
    <div className="mx-auto min-h-screen w-full max-w-screen-2xl bg-[#f4f7fe] p-4 font-sans text-gray-800 sm:p-6 md:p-8">
      
      {/* ส่วนหัวหน้าจอ */}
      <div className="mb-8 flex flex-col justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 md:flex-row md:items-end">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-rose-500 fill-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-xl font-extrabold text-[#111c44] sm:text-2xl">ประวัติการแจ้งเตือน (Notifications)</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">ตรวจสอบประวัติการส่งแจ้งเตือนระบบไปยังผู้ใช้งานทั้งหมด</p>
          </div>
        </div>
        
        {/* ปุ่มสร้างแจ้งเตือนใหม่ (สำหรับ UI ไปก่อน สามารถต่อยอดทำ Modal ส่งแจ้งเตือนได้) */}
        <button type="button" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#111c44] px-5 py-2.5 font-bold text-white shadow-sm transition-all hover:bg-[#0f2b6f] md:w-auto">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          ส่งการแจ้งเตือนใหม่
        </button>
      </div>

      {/* เรียกใช้งาน Client Component */}
      <DocumentExpiryNotificationSection
        summary={documentExpiryAlerts.summary}
        items={documentExpiryAlerts.items}
      />

      <NotificationClient initialData={mappedNotifications} />

    </div>
  );
}
