import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function RestorePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto min-h-screen w-full max-w-screen-2xl bg-[#f4f7fe] p-4 font-sans text-gray-800 sm:p-6 md:p-8">
      <div className="flex justify-between items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-extrabold text-[#111c44]">กู้คืนข้อมูล (Restore)</h1>
          <p className="text-sm text-gray-500 mt-1">นำเข้าไฟล์ SQL หรือข้อมูลสำรองเพื่อกู้คืนระบบ</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center border-dashed border-2 border-red-200">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">อัปโหลดไฟล์ข้อมูลสำรอง</h2>
        <p className="text-sm text-gray-500 mb-6">ข้อควรระวัง: การกู้คืนข้อมูลจะทำการเขียนทับข้อมูลปัจจุบันทั้งหมด</p>
        <button className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-red-600 transition-all">
          เลือกไฟล์ที่ต้องการ Restore
        </button>
      </div>
    </div>
  );
}
