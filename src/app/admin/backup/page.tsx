import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function BackupPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto min-h-screen w-full max-w-screen-2xl bg-[#f4f7fe] p-4 font-sans text-gray-800 sm:p-6 md:p-8">
      <div className="flex justify-between items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-extrabold text-[#111c44]">สำรองข้อมูล (Backup)</h1>
          <p className="text-sm text-gray-500 mt-1">สำรองฐานข้อมูลและไฟล์เอกสารเพื่อป้องกันข้อมูลสูญหาย</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">สำรองฐานข้อมูลล่าสุด</h2>
        <button className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-600 transition-all mt-4">
          เริ่มการ Backup ตอนนี้
        </button>
      </div>
    </div>
  );
}
