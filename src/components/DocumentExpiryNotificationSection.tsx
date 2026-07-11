import SecureDocumentButton from "@/components/SecureDocumentButton";
import type { DocumentExpiryAlertItem, DocumentExpirySummary } from "@/lib/document-alerts";

const statusClass: Record<DocumentExpiryAlertItem["status"], string> = {
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
  warning_soon: "bg-orange-50 text-orange-700 border-orange-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-red-100 text-red-800 border-red-200",
  overdue: "bg-red-100 text-red-800 border-red-200",
};

export default function DocumentExpiryNotificationSection({
  summary,
  items,
  limit,
}: {
  summary: DocumentExpirySummary;
  items: DocumentExpiryAlertItem[];
  limit?: number;
}) {
  const visibleItems = typeof limit === "number" ? items.slice(0, limit) : items;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#111c44]">แจ้งเตือนเอกสารใกล้หมดอายุ</h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Passport, Visa, Work Permit และ 90 Days ที่เหลือไม่เกิน 30 วันหรือเลยกำหนดแล้ว</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          {[
            ["ทั้งหมด", summary.total],
            ["30 วัน", summary.warning],
            ["15 วัน", summary.warning_soon],
            ["7 วัน", summary.urgent],
            ["หมด/เกิน", summary.expired + summary.overdue],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-gray-50 px-3 py-2 border border-gray-100">
              <div className="text-lg font-black text-[#111c44]">{value}</div>
              <div className="text-[10px] font-bold text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 text-[12px]">
            <tr>
              <th className="p-4 font-bold">พนักงาน</th>
              <th className="p-4 font-bold">บริษัท</th>
              <th className="p-4 font-bold">เอกสาร</th>
              <th className="p-4 font-bold">วันครบกำหนด</th>
              <th className="p-4 font-bold">คงเหลือ</th>
              <th className="p-4 font-bold">สถานะ</th>
              <th className="p-4 font-bold text-center">ไฟล์</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-[13px]">
            {visibleItems.map((item) => {
              const hasFile = item.hasFile;

              return (
              <tr key={`${item.employeeId}-${item.documentType}`} className="hover:bg-blue-50/20">
                <td className="p-4">
                  <div className="font-extrabold text-gray-800">{item.employeeName}</div>
                  <div className="text-[11px] text-gray-400 font-bold">{item.emp_code || "-"}</div>
                </td>
                <td className="p-4 text-gray-600">{item.companyName}</td>
                <td className="p-4 font-bold text-gray-700">{item.documentLabel}</td>
                <td className="p-4 text-gray-600">{item.dueDate}</td>
                <td className="p-4 font-bold text-gray-700">{item.daysRemaining < 0 ? `เลย ${Math.abs(item.daysRemaining)} วัน` : `${item.daysRemaining} วัน`}</td>
                <td className="p-4">
                  <span className={`inline-flex px-3 py-1 rounded-lg border text-[11px] font-extrabold ${statusClass[item.status]}`}>
                    {item.statusLabel}
                  </span>
                </td>
                <td className="p-4 text-center">
                  {hasFile && item.source === "spx_document" ? (
                    <SecureDocumentButton employeeId={item.employeeId} documentType={item.documentType} className="bg-[#eff6ff] text-[#2563eb] px-4 py-2 rounded-xl text-[12px] font-extrabold hover:bg-blue-100 transition-colors">
                      เปิดดูไฟล์
                    </SecureDocumentButton>
                  ) : hasFile && item.viewUrl ? (
                    <SecureDocumentButton viewUrl={item.viewUrl} className="inline-flex bg-[#eff6ff] text-[#2563eb] px-4 py-2 rounded-xl text-[12px] font-extrabold hover:bg-blue-100 transition-colors">
                      เน€เธเธดเธ”เธ”เธนเนเธเธฅเน
                    </SecureDocumentButton>
                  ) : (
                    <span className="inline-flex px-3 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-[11px] font-extrabold">
                      ยังไม่มีไฟล์
                    </span>
                  )}
                </td>
              </tr>
              );
            })}
            {visibleItems.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400 font-bold bg-gray-50/40">
                  ไม่มีเอกสารใกล้หมดอายุในช่วง 30 วัน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
