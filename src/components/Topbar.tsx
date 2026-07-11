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
    <div className="flex min-w-0 items-center justify-between gap-4 bg-transparent px-4 py-3 lg:px-6">
      <h1 className="min-w-0 truncate text-lg font-extrabold text-[#0f2b6f] lg:text-xl" title={title}>
        {title}
      </h1>
      <div className="flex max-w-[45%] shrink-0 cursor-pointer items-center gap-3 rounded-full border border-gray-100 bg-white py-1.5 pl-2 pr-4 shadow-sm transition-colors hover:bg-gray-50 lg:pr-5">
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
        <div className="flex min-w-0 flex-col justify-center">
          <span className="mb-1 truncate text-[13px] font-extrabold leading-none text-[#0f2b6f] lg:text-[14px]" title={user?.name}>{user?.name || "ผู้ใช้งาน"}</span>
          <span className="truncate text-[10px] font-medium leading-none text-[#64748b]">{displayRole}</span>
        </div>
      </div>
    </div>
  );
}
