import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function RolesPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div className="font-sans text-gray-800 bg-[#f4f7fe] min-h-screen p-6 md:p-8">
      <div className="flex justify-between items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-extrabold text-[#111c44]">จัดการสิทธิ์ผู้ใช้ (Roles & Permissions)</h1>
          <p className="text-sm text-gray-500 mt-1">กำหนดบทบาทและสิทธิ์การเข้าถึงเมนูต่างๆ ของแต่ละกลุ่มผู้ใช้งาน</p>
        </div>
        <button className="bg-[#4318FF] text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-all">
          + สร้างกลุ่มสิทธิ์ใหม่
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-center text-gray-400 py-10">( โครงสร้างตารางสิทธิ์การใช้งานรอการเชื่อมต่อ Database )</p>
      </div>
    </div>
  );
}