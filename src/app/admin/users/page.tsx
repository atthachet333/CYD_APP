import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto min-h-screen w-full max-w-screen-2xl bg-[#f4f7fe] p-4 font-sans text-gray-800 sm:p-6 md:p-8">
      <div className="mb-8 flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 md:flex-row md:items-end">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-extrabold text-[#111c44] sm:text-2xl">จัดการผู้ใช้งาน (Users)</h1>
          <p className="text-sm text-gray-500 mt-1">เพิ่ม ลบ หรือแก้ไขข้อมูลและรหัสผ่านของผู้ใช้งานในระบบ</p>
        </div>
        <button type="button" className="min-h-11 w-full rounded-xl bg-[#4318FF] px-5 py-2.5 font-bold text-white shadow-sm transition-all hover:bg-blue-700 md:w-auto">
          + เพิ่มผู้ใช้งานใหม่
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-center text-gray-400 py-10">( โครงสร้างตารางรายชื่อผู้ใช้งานรอการเชื่อมต่อ Database )</p>
      </div>
    </div>
  );
}
