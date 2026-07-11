import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UploadFormClient from "./UploadFormClient";

export default async function UploadDocumentPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  // ดึงรายการหมวดหมู่มาใช้ใน Dropdown ของฟอร์ม
  const categories = await prisma.categories.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div className="mx-auto min-h-screen w-full max-w-screen-2xl bg-[#f4f7fe] p-4 font-sans text-gray-800 sm:p-6 md:p-8">
      
      {/* ส่วนหัวหน้าจอ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-indigo-500 fill-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#111c44] tracking-tight">อัปโหลดไฟล์เอกสาร</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">เพิ่มเอกสารบริษัท แบบฟอร์ม หรือข้อมูลทั่วไปเข้าสู่ระบบส่วนกลาง</p>
          </div>
        </div>
      </div>

      {/* เรียกใช้งาน Form Client Component */}
      <UploadFormClient categories={categories} />

    </div>
  );
}
