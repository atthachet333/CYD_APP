"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

const routeTitles: Record<string, string> = {
  "/dashboard": "แดชบอร์ดภาพรวม",
  "/employees": "ลงทะเบียนข้อมูลพนักงาน",
  "/employee-doc-approvals": "อนุมัติเอกสาร",
  "/ninety-day-renewal": "ต่อเอกสาร 90 วัน",
  "/passport-renewal": "ต่อเอกสารพาสปอร์ต",
  "/visa-renewal": "ต่อเอกสารวีซ่า",
  "/work-permit-renewal": "ต่อใบอนุญาตทำงาน",
};

export default function Topbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading" || !session) return null;

  const user = session.user as any;
  const title = routeTitles[pathname] || "ระบบจัดการเอกสาร";

  const roleMap: Record<string, string> = {
    "ADMIN": "ผู้ดูแลระบบ",
    "STAFF": "เจ้าหน้าที่ปฏิบัติการ",
    "CUSTOMER": "ลูกค้า",
  };
  const displayRole = roleMap[user?.role] || user?.role;

  return (
    <div className="flex justify-between items-center px-4 lg:px-6 py-3 bg-transparent">
      <h1 className="text-lg lg:text-xl font-extrabold text-[#0f2b6f] tracking-wide">
        {title}
      </h1>
      <div className="bg-white pl-2 pr-4 lg:pr-5 py-1.5 rounded-full shadow-sm border border-gray-100 flex items-center space-x-3 transition-colors hover:bg-gray-50 cursor-pointer">
        <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-gray-50 flex items-center justify-center shadow-sm">
          <img
            src="/profile-placeholder.png"
            alt="Profile"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[#0f2b6f] font-extrabold text-[13px] lg:text-[14px] leading-none mb-1">{user?.name || "ผู้ใช้งาน"}</span>
          <span className="text-[#64748b] text-[10px] font-medium leading-none">{displayRole}</span>
        </div>
      </div>
    </div>
  );
}