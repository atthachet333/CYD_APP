import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ApprovalTableClient from "./ApprovalTableClient";

const INTERNAL_ROLES = new Set(["ADMIN", "STAFF", "SUPERADMIN"]);

async function currentUser(session: any) {
  const username = session?.user?.username || session?.user?.name || "";
  const email = session?.user?.email || "";

  return prisma.users.findFirst({
    where: { OR: [{ username }, { email }, { full_name: session?.user?.name || "" }] },
    include: { roles: true },
  });
}

export default async function DocApprovalsPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");

  const user = await currentUser(session);
  const role = String(user?.roles?.name || (session.user as any)?.role || "").toUpperCase();

  if (!INTERNAL_ROLES.has(role)) {
    redirect("/company-dashboard");
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto font-sans text-gray-800 bg-[#f4f7fe] min-h-screen space-y-6">
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-bl from-blue-50 to-transparent rounded-full opacity-60" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0a1e4d] to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-[#111c44] tracking-tight">ระบบอนุมัติเอกสาร</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">ตรวจสอบและจัดการคำขออนุมัติเอกสารพนักงานในระบบ</p>
          </div>
        </div>
      </div>

      <ApprovalTableClient />
    </div>
  );
}
