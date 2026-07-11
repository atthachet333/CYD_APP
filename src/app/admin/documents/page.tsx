import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DocumentTableClient from "./DocumentTableClient";

export default async function DocumentsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  // ดึงข้อมูลเอกสารทั้งหมด พร้อม Include ชื่อหมวดหมู่ และ ชื่อคนอัปโหลด
  const documents = await prisma.documents.findMany({
    include: {
      categories: true,
      users: true,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  // Map ข้อมูลเพื่อแก้ปัญหา BigInt (file_size) และดึงชื่อจาก Relation ให้ใช้งานง่ายขึ้น
  const mappedDocuments = documents.map((doc) => ({
    id: doc.id,
    doc_no: doc.doc_no,
    title: doc.title,
    file_name: doc.file_name,
    file_ext: doc.file_ext || '.unk',
    file_size: Number(doc.file_size), // แปลง BigInt เป็น Number เพื่อส่งให้ Client Component
    is_starred: doc.is_starred,
    created_at: doc.created_at.toISOString(),
    categoryName: doc.categories?.name || 'ไม่ระบุหมวดหมู่',
    uploaderName: doc.users?.full_name || 'System',
  }));

  return (
    <div className="mx-auto min-h-screen w-full max-w-screen-2xl bg-[#f4f7fe] p-4 font-sans text-gray-800 sm:p-6 md:p-8">
      
      {/* ส่วนหัวหน้าจอ */}
      <div className="mb-8 flex flex-col justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 md:flex-row md:items-end">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-amber-500 fill-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-xl font-extrabold text-[#111c44] sm:text-2xl">ไฟล์ติดดาว / จัดการเอกสาร</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">จัดการเอกสารสำคัญ ดาวน์โหลด หรือค้นหาไฟล์ทั้งหมดในระบบ</p>
          </div>
        </div>
      </div>

      {/* เรียกใช้งาน Client Component สำหรับแสดงตาราง */}
      <DocumentTableClient initialData={mappedDocuments} />

    </div>
  );
}
