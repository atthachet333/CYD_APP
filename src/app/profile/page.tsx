import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const user = session.user as any;
  const role = String(user?.role || "CUSTOMER").toUpperCase();

  // กำหนดรูปแบบและสีตาม Role
  const roleStyles: Record<string, any> = {
    ADMIN: { label: "ผู้ดูแลระบบสูงสุด (Admin)", color: "bg-red-500", shadow: "shadow-red-500/30", bgIcon: "bg-red-50 text-red-500" },
    STAFF: { label: "เจ้าหน้าที่ปฏิบัติการ (Staff)", color: "bg-teal-500", shadow: "shadow-teal-500/30", bgIcon: "bg-teal-50 text-teal-500" },
    CUSTOMER: { label: "ลูกค้าองค์กร (Customer)", color: "bg-[#1e3a8a]", shadow: "shadow-blue-900/30", bgIcon: "bg-blue-50 text-[#1e3a8a]" }
  };

  const style = roleStyles[role] || roleStyles.CUSTOMER;

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-[#f4f7fe] p-4 font-sans">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gray-50 bg-white p-6 text-center shadow-xl sm:p-10">
        
        {/* Background Pattern ด้านบน */}
        <div className={`absolute top-0 left-0 w-full h-32 ${style.color} opacity-90`}></div>
        
        {/* รูปโปรไฟล์ตรงกลาง (ใช้ตัวย่อชื่อ หรือถ้ารูปจริงให้แก้ src ใน img) */}
        <div className={`relative z-10 mx-auto w-32 h-32 mt-12 mb-6 rounded-full border-4 border-white shadow-lg ${style.bgIcon} flex items-center justify-center overflow-hidden`}>
          {user?.image ? (
             <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
          ) : (
             <span className="text-5xl font-extrabold tracking-tighter">
                {user?.name ? user.name.substring(0, 2).toUpperCase() : role.substring(0, 2)}
             </span>
          )}
        </div>

        {/* ข้อมูลโปรไฟล์ */}
        <h1 className="mb-1 break-words text-xl font-extrabold text-gray-800 sm:text-3xl">{user?.name || "ไม่ระบุชื่อ"}</h1>
        <p className="mb-6 break-all font-medium text-gray-500">{user?.email || "ไม่มีอีเมลในระบบ"}</p>

        {/* ป้ายแสดงสิทธิ์ (Role Badge) */}
        <div className="inline-block px-5 py-2.5 bg-gray-50 rounded-2xl border border-gray-100 mb-8">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">ตำแหน่ง / สิทธิ์การใช้งาน</p>
          <div className="flex items-center justify-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${style.color} animate-pulse`}></span>
            <span className={`text-sm font-extrabold ${style.color.replace('bg-', 'text-')}`}>
              {style.label}
            </span>
          </div>
        </div>

        {/* ปุ่มจัดการ */}
        <button className={`w-full py-3.5 rounded-xl text-white font-bold transition-all shadow-lg hover:-translate-y-0.5 ${style.color} ${style.shadow}`}>
          แก้ไขข้อมูลโปรไฟล์
        </button>
      </div>
    </div>
  );
}
