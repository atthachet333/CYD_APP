"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

// 👉 1. เพิ่ม { isOpen } ตรงนี้เพื่อรับคำสั่ง
export default function Sidebar({ isOpen = true, onNavigate }: { isOpen?: boolean; onNavigate?: () => void }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter(); // เพิ่ม useRouter สำหรับเปลี่ยนหน้าภายในแอป
  const user = session?.user as any;

  const role = String(user?.role || "CUSTOMER").toUpperCase();

  const menuConfig = [
    { name: "Dashboard", path: "/dashboard", roles: ["ADMIN", "STAFF"] },
    { name: "ลงทะเบียนข้อมูลพนักงาน", path: "/employees", roles: ["ADMIN", "STAFF"] },
    { name: "อนุมัติเอกสาร", path: "/employee-doc-approvals", roles: ["ADMIN", "STAFF"] },
    { name: "ต่อเอกสาร 90 วัน", path: "/ninety-day-renewal", roles: ["ADMIN", "STAFF"] },
    { name: "ต่อเอกสารพาสปอร์ต", path: "/passport-renewal", roles: ["ADMIN", "STAFF"] },
    { name: "ต่อเอกสารวีซ่า", path: "/visa-renewal", roles: ["ADMIN", "STAFF"] },
    { name: "ต่อใบอนุญาตทำงาน", path: "/work-permit-renewal", roles: ["ADMIN", "STAFF"] },
    { name: "โปรไฟล์", path: "/profile", roles: ["ADMIN", "STAFF"] },

    { name: "สถานะคำขอ", path: "/admin/permit-requests", roles: ["ADMIN"] },
    { name: "Import เอกสาร", path: "/admin/import", roles: ["ADMIN"] },
    { name: "ไฟล์ติดดาว", path: "/admin/documents", roles: ["ADMIN"] },
    { name: "หมวดหมู่", path: "/admin/categories", roles: ["ADMIN"] },
    { name: "อัปโหลดไฟล์", path: "/admin/company-doc-file", roles: ["ADMIN"] },
    { name: "การแจ้งเตือน", path: "/admin/notifications", roles: ["ADMIN"] },
    { name: "ผู้ใช้งาน", path: "/admin/users", roles: ["ADMIN"] },
    { name: "สิทธิ์ผู้ใช้", path: "/admin/roles", roles: ["ADMIN"] },
    { name: "Logs", path: "/admin/logs", roles: ["ADMIN"] },
    { name: "Backup", path: "/admin/backup", roles: ["ADMIN"] },
    { name: "Restore", path: "/admin/restore", roles: ["ADMIN"] },
    { name: "ตั้งค่า", path: "/admin/setting", roles: ["ADMIN"] },
    { name: "หน้าแรก", path: "/company-dashboard", roles: ["CUSTOMER"] },
  ];

  // ฟังก์ชันใหม่สำหรับจัดการ Logout ไม่ให้เด้งไป Chrome
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await signOut({ redirect: false });
    router.replace("/login");
  };

  return (
    // 👉 2. ใส่กลไกยืด-หด: ถ้า isOpen เป็นจริง ให้กว้าง w-64 ถ้าเป็นเท็จให้กว้าง w-0
    <aside className={`flex h-full max-h-screen shrink-0 flex-col overflow-hidden bg-[#0f2b6f] text-white transition-all duration-300 ease-in-out ${isOpen ? 'w-64 max-w-full' : 'w-0'}`}>

      {/* 3. ล็อกกล่องด้านในไว้ที่ w-64 เสมอ เพื่อให้เมนูไม่บีบตัวเละ */}
      <div className="flex h-full w-64 max-w-full flex-1 flex-col">
        <div className="p-4 border-b border-[#1a3a8f]/50">
          <div className="bg-[#1a3a8f] p-2.5 rounded-2xl flex items-center space-x-3 shadow-inner">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 p-1 shadow-sm">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.style.display = "none";
                }} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-extrabold text-[13px] text-white tracking-wide truncate">
                CHAIYADETPROG...
              </span>
              <span className="text-[10px] text-blue-200 mt-0.5 truncate">
                ระบบจัดการเอกสารบริษัท
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuConfig
            .filter((item) => item.roles.includes(role))
            .map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={onNavigate}
                title={item.name}
                className={`block min-h-11 break-words rounded-lg px-4 py-2.5 text-sm leading-6 transition-colors ${pathname === item.path ? 'bg-[#1a3a8f] font-bold' : 'hover:bg-[#1a3a8f]'
                  }`}
              >
                {item.name}
              </Link>
            ))}

          <button
            onClick={handleLogout}
            className="mt-4 min-h-11 w-full rounded-lg px-4 py-3 text-left text-sm font-bold text-red-400 transition-colors hover:bg-red-900/20 hover:text-white"
          >
            ออกจากระบบ
          </button>
        </nav>
      </div>
    </aside>
  );
}
