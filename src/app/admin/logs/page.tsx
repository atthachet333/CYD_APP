import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function LogsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto min-h-screen w-full max-w-screen-2xl bg-[#f4f7fe] p-4 font-sans text-gray-800 sm:p-6 md:p-8">
      <div className="flex justify-between items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-extrabold text-[#111c44]">ประวัติการใช้งานระบบ (System Logs)</h1>
          <p className="text-sm text-gray-500 mt-1">ตรวจสอบการเข้าสู่ระบบและการทำรายการต่างๆ ของผู้ใช้เพื่อความปลอดภัย</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-center text-gray-400 py-10">( โครงสร้างตาราง Logs รอการเชื่อมต่อ Database )</p>
      </div>
    </div>
  );
}
