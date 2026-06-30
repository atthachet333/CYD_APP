import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div className="font-sans text-gray-800 bg-[#f4f7fe] min-h-screen p-6 md:p-8">
      <div className="flex justify-between items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-extrabold text-[#111c44]">จัดการผู้ใช้งาน (Users)</h1>
          <p className="text-sm text-gray-500 mt-1">เพิ่ม ลบ หรือแก้ไขข้อมูลและรหัสผ่านของผู้ใช้งานในระบบ</p>
        </div>
        <button className="bg-[#4318FF] text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-all">
          + เพิ่มผู้ใช้งานใหม่
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-center text-gray-400 py-10">( โครงสร้างตารางรายชื่อผู้ใช้งานรอการเชื่อมต่อ Database )</p>
      </div>
    </div>
  );
}