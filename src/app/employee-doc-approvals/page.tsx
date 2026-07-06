// src/app/employee-doc-approvals/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DocApprovalsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const user = session.user as any;
  const role = String(user?.role).toUpperCase();

  if (role === "CUSTOMER") {
    redirect("/company-dashboard");
  }

  // ตัวอย่างการดึงข้อมูลเล่นๆ หรือเชื่อมตารางจริงของคุณ (เช่น สถานะที่รออนุมัติ)
  // const approvals = await prisma.document_requests.findMany({ orderBy: { created_at: 'desc' } });

  return (
    // 🟢 มีระยะเว้นขอบรอบด้าน p-4 sm:p-6 md:p-8 ไม่ติดแถบ Topbar แน่นอน
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto font-sans text-gray-800 bg-[#f4f7fe] min-h-screen space-y-6">
      
      {/* 🚀 1.ส่วนหัวข้อหน้า Frame พรีเมียม */}
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-bl from-blue-50 to-transparent rounded-full opacity-60"></div>
        
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

      {/* 🚀 2. การ์ดสถิติย่อยภายในหน้าอนุมัติเอกสาร */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-amber-300 transition-all">
          <div>
            <span className="text-gray-400 font-bold text-xs block mb-1">คำขอรอตรวจสอบ</span>
            <span className="text-2xl font-black text-amber-500">0 <span className="text-xs font-bold text-gray-400">รายการ</span></span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">⏳</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition-all">
          <div>
            <span className="text-gray-400 font-bold text-xs block mb-1">อนุมัติแล้วเดือนนี้</span>
            <span className="text-2xl font-black text-emerald-600">0 <span className="text-xs font-bold text-gray-400">รายการ</span></span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">✅</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-rose-300 transition-all">
          <div>
            <span className="text-gray-400 font-bold text-xs block mb-1">ปฏิเสธคำขอ</span>
            <span className="text-2xl font-black text-rose-600">0 <span className="text-xs font-bold text-gray-400">รายการ</span></span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">❌</div>
        </div>
      </div>

      {/* 🚀 3. กรอบเนื้อหาหลักและตารางข้อมูล */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#0a1e4d] via-blue-500 to-cyan-400"></div>
        
        {/* ส่วนตัวกรอง */}
        <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30">
          <div className="flex space-x-4 text-xs md:text-sm font-bold text-gray-400 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
            <span className="text-blue-600 border-b-2 border-blue-600 pb-2 cursor-pointer">คำขอทั้งหมด (0)</span>
            <span className="hover:text-gray-700 pb-2 cursor-pointer transition-colors">ตรวจผ่านแล้ว</span>
            <span className="hover:text-gray-700 pb-2 cursor-pointer transition-colors">ถูกปฏิเสธ</span>
          </div>
          
          <div className="relative w-full sm:w-72">
            <input 
              type="text" 
              placeholder="ค้นหาเลขคำขอ, รหัสพนักงาน..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-4 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* ตารางคำขออนุมัติเอกสาร */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/80 text-gray-500 border-b border-gray-100 uppercase tracking-wider text-[11px] md:text-xs font-bold">
                <th className="p-4 pl-6">เลขที่คำขอ</th>
                <th className="p-4">พนักงาน</th>
                <th className="p-4">ประเภทเอกสาร</th>
                <th className="p-4 text-center">สถานะ</th>
                <th className="p-4 text-right">วันที่ยื่นเรื่อง</th>
                <th className="p-4 text-center pr-6">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs md:text-sm font-medium text-gray-700">
              {/* เมื่อไม่มีข้อมูล */}
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <p>ไม่มีข้อมูลคำขอรออนุมัติ</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}