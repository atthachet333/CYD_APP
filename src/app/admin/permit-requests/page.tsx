import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RequestTableClient from "./RequestTableClient";

export default async function RequestStatusPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const approvals = await prisma.employee_document_approvals.findMany({
    orderBy: { created_at: 'desc' },
  });

  const profileIds = approvals.map(a => a.profile_id).filter(id => id !== null) as number[];
  const profiles = await prisma.employee_document_profiles.findMany({
    where: { id: { in: profileIds } }
  });

  const companyIds = profiles.map(p => p.company_id).filter(id => id !== null) as number[];
  const companies = await prisma.companies.findMany({
    where: { id: { in: companyIds } }
  });

  const mappedApprovals = approvals.map((req) => {
    const profile = profiles.find(p => p.id === req.profile_id);
    const company = companies.find(c => c.id === profile?.company_id);

    return {
      id: req.id,
      action_type: req.action_type,
      status: req.status,
      created_at: req.created_at.toISOString(),
      employeeName: profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'ไม่ระบุ',
      employeeNameTh: profile ? `${profile.first_name_th || ''} ${profile.last_name_th || ''}`.trim() : '',
      employeeNameEn: profile ? `${profile.first_name_en || ''} ${profile.last_name_en || ''}`.trim() : '',
      passport: profile?.passport_number || profile?.passport_no || 'ไม่ระบุ',
      companyName: company?.company_name || 'ไม่ระบุ',
    };
  });

  return (
    <div className="mx-auto min-h-screen w-full max-w-screen-2xl bg-[#f4f7fe] p-4 font-sans text-gray-800 sm:p-6 md:p-8">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#4318FF]/10 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-[#4318FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#111c44] tracking-tight">สถานะคำขอ (Approvals)</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">ติดตาม จัดการ และอนุมัติรายการคำขอเอกสารของพนักงาน</p>
          </div>
        </div>
      </div>

      <RequestTableClient initialData={mappedApprovals} />

    </div>
  );
}
