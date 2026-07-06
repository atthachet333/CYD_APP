import { prisma } from "@/lib/prisma";

export default async function WorkPermitRenewalPage() {
  const allProfiles = await prisma.employee_document_profiles.findMany();

  let total = allProfiles.length;
  let noData = 0;
  let overdue = 0;
  let expiringSoon = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);

  const tableData: typeof allProfiles = [];

  allProfiles.forEach(p => {
    if (!p.work_permit_expiry_date) {
      noData++;
    } else {
      tableData.push(p);
      const targetDate = new Date(p.work_permit_expiry_date);
      targetDate.setHours(0, 0, 0, 0);

      if (targetDate < today) {
        overdue++;
      } else if (targetDate <= in7Days) {
        expiringSoon++;
      }
    }
  });

  tableData.sort((a, b) => new Date(a.work_permit_expiry_date!).getTime() - new Date(b.work_permit_expiry_date!).getTime());

  const getStatus = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diffTime = d.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: "เกินกำหนด", color: "bg-red-100 text-red-700", days: diffDays };
    if (diffDays <= 7) return { label: "ด่วนมาก (ใน 7 วัน)", color: "bg-orange-100 text-orange-700", days: diffDays };
    if (diffDays <= 30) return { label: "ใกล้หมดอายุ", color: "bg-yellow-100 text-yellow-700", days: diffDays };
    return { label: "ปกติ", color: "bg-green-100 text-green-700", days: diffDays };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">แจ้งเตือนต่อใบอนุญาตทำงาน</h1>
        <p className="text-sm text-gray-500 mt-1">รายการใบอนุญาตทำงาน (Work Permit) ที่ใกล้หมดอายุ</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-[13px] font-semibold text-gray-500 mb-2">ทั้งหมด</div>
          <div className="text-3xl font-bold text-[#0f2b6f]">{total}</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-[13px] font-semibold text-gray-500 mb-2">ใกล้ครบกำหนด (7 วัน)</div>
          <div className="text-3xl font-bold text-[#c25e00]">{expiringSoon}</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-[13px] font-semibold text-gray-500 mb-2">เกินกำหนด</div>
          <div className="text-3xl font-bold text-[#b91c1c]">{overdue}</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-[13px] font-semibold text-gray-500 mb-2">ยังไม่มีข้อมูล</div>
          <div className="text-3xl font-bold text-[#64748b]">{noData}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">รายการที่ต้องดำเนินการ</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-white text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold">ชื่อ-นามสกุล</th>
                <th className="px-6 py-4 font-semibold">เลขพาสปอร์ต</th>
                <th className="px-6 py-4 font-semibold text-center">วันที่ใบอนุญาตหมดอายุ</th>
                <th className="px-6 py-4 font-semibold text-center">เวลาที่เหลือ</th>
                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">ไม่พบรายการที่ต้องดำเนินการ</td>
                </tr>
              ) : (
                tableData.map((p) => {
                  const status = getStatus(p.work_permit_expiry_date!);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{p.first_name} {p.last_name}</td>
                      <td className="px-6 py-4 font-mono text-gray-500">{p.passport_no || "-"}</td>
                      <td className="px-6 py-4 text-center font-mono">
                        {p.work_permit_expiry_date?.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-gray-700">
                        {status.days < 0 ? `ผ่านมาแล้ว ${Math.abs(status.days)} วัน` : `เหลืออีก ${status.days} วัน`}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}