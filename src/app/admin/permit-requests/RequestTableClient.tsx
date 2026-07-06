"use client";

import { useState } from "react";

export default function RequestTableClient({ initialData }: { initialData: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  // Logic กรองข้อมูลเหมือนเดิมเป๊ะ
  const filteredData = initialData.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.employeeName.toLowerCase().includes(searchLower) ||
      item.employeeNameTh.toLowerCase().includes(searchLower) ||
      item.employeeNameEn.toLowerCase().includes(searchLower) ||
      item.passport.toLowerCase().includes(searchLower) ||
      item.companyName.toLowerCase().includes(searchLower) ||
      `REQ-${item.id}`.toLowerCase().includes(searchLower)
    );
  });

  // ปรับสี Badge ให้ดูซอฟต์และโมเดิร์นขึ้น
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return { text: 'รอดำเนินการ', color: 'bg-amber-50 text-amber-600 border-amber-200' };
      case 'approved':
      case 'completed': return { text: 'เสร็จสิ้น', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
      case 'rejected':
      case 'failed': return { text: 'ปฏิเสธ', color: 'bg-rose-50 text-rose-600 border-rose-200' };
      default: return { text: status, color: 'bg-slate-50 text-slate-600 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* กล่องค้นหาพนักงาน */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#4318FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          ค้นหาข้อมูลพนักงาน
        </h2>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="พิมพ์ชื่อ นามสกุล บริษัท หรือเลขพาสปอร์ต..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4318FF]/40 focus:bg-white transition-all text-sm text-gray-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-2 ml-1">รองรับการค้นหาจาก: ชื่อ-นามสกุล, ชื่อเต็ม, พาสปอร์ต, ชื่อบริษัท และรหัสคำขอ</p>
      </div>

      {/* ตารางแสดงข้อมูล */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#f8fafc] text-gray-600 border-b border-gray-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold">รหัสรายการ</th>
                <th className="px-6 py-4 font-bold">ชื่อพนักงาน</th>
                <th className="px-6 py-4 font-bold">พาสปอร์ต</th>
                <th className="px-6 py-4 font-bold">บริษัท</th>
                <th className="px-6 py-4 font-bold">ประเภทคำขอ</th>
                <th className="px-6 py-4 font-bold">วันที่สร้าง</th>
                <th className="px-6 py-4 font-bold text-center">สถานะ</th>
                <th className="px-6 py-4 font-bold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((req) => {
                  const badge = getStatusBadge(req.status);
                  return (
                    <tr key={req.id} className="hover:bg-[#f8fafc] transition-colors group">
                      <td className="px-6 py-4 font-semibold text-[#4318FF]">REQ-{req.id.toString().padStart(4, '0')}</td>
                      <td className="px-6 py-4">
                        <div className="text-gray-800 font-medium">{req.employeeName}</div>
                        {req.employeeNameTh && req.employeeNameTh.trim() !== '' && (
                          <div className="text-xs text-gray-400 mt-0.5">{req.employeeNameTh}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{req.passport}</td>
                      <td className="px-6 py-4 text-gray-600 truncate max-w-[180px]" title={req.companyName}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {req.companyName.charAt(0)}
                          </div>
                          <span className="truncate">{req.companyName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 uppercase text-xs font-bold">{req.action_type}</td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(req.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1.5 border rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${badge.color}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {badge.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-gray-400 hover:text-[#4318FF] hover:bg-blue-50 p-2 rounded-lg transition-all duration-200 transform group-hover:scale-110" title="ดูรายละเอียด">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      </div>
                      <p className="text-gray-500 font-medium">ไม่พบข้อมูลที่ตรงกับการค้นหา</p>
                      <p className="text-sm text-gray-400 mt-1">ลองเปลี่ยนคำค้นหาเป็นชื่อบริษัท หรือเลขพาสปอร์ตแบบอื่นดูอีกครั้ง</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}