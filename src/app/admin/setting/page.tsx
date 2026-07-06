import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function SettingPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div className="font-sans text-gray-800 bg-[#f4f7fe] min-h-screen p-6 md:p-8">
      <div className="flex justify-between items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-extrabold text-[#111c44]">ตั้งค่าระบบ (Settings)</h1>
          <p className="text-sm text-gray-500 mt-1">ปรับแต่งข้อมูลบริษัท การแสดงผล และการตั้งค่าพื้นฐานของระบบ</p>
        </div>
        <button className="bg-[#4318FF] text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-all">
          บันทึกการตั้งค่า
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-700 mb-4">ข้อมูลองค์กร</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">ชื่อระบบ / บริษัท</label>
              <input type="text" className="w-full px-4 py-2 border rounded-lg bg-gray-50" defaultValue="CHAIYADET PROGRESS" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">อีเมลผู้ดูแลระบบ</label>
              <input type="email" className="w-full px-4 py-2 border rounded-lg bg-gray-50" defaultValue="admin@chaiyadet.com" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-700 mb-4">การตั้งค่าแสดงผล</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">( โครงสร้างฟอร์มการตั้งค่ารอการปรับแต่ง )</p>
          </div>
        </div>
      </div>
    </div>
  );
}