"use client";

import { useState } from "react";

export default function NotificationClient({ initialData }: { initialData: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, read, unread

  // ฟังก์ชันกรองข้อมูล
  const filteredData = initialData.filter((item) => {
    // 1. กรองด้วยคำค้นหา
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = 
      item.title.toLowerCase().includes(searchLower) ||
      (item.body && item.body.toLowerCase().includes(searchLower)) ||
      item.recipientName.toLowerCase().includes(searchLower);

    // 2. กรองด้วยสถานะการอ่าน
    let matchStatus = true;
    if (filterStatus === "read") matchStatus = item.is_read === true;
    if (filterStatus === "unread") matchStatus = item.is_read === false;

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* กล่องค้นหาและตัวกรอง */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#4318FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              ค้นหาการแจ้งเตือน
            </h2>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                placeholder="พิมพ์หัวข้อ, ข้อความ หรือชื่อผู้รับ..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4318FF]/40 focus:bg-white transition-all text-sm text-gray-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-3">สถานะ</h2>
            <select 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4318FF]/40 focus:bg-white transition-all text-sm text-gray-800"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">แสดงทั้งหมด</option>
              <option value="unread">ยังไม่อ่าน (Unread)</option>
              <option value="read">อ่านแล้ว (Read)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ตารางแสดงข้อมูลการแจ้งเตือน */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#f8fafc] text-gray-600 border-b border-gray-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold">หัวข้อการแจ้งเตือน</th>
                <th className="px-6 py-4 font-bold">ข้อความ (Body)</th>
                <th className="px-6 py-4 font-bold">ส่งถึง (ผู้รับ)</th>
                <th className="px-6 py-4 font-bold">วันที่ส่ง</th>
                <th className="px-6 py-4 font-bold text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((noti) => (
                  <tr key={noti.id} className={`hover:bg-[#f8fafc] transition-colors ${!noti.is_read ? 'bg-blue-50/20' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${noti.is_read ? 'bg-transparent' : 'bg-[#4318FF]'}`}></div>
                        <span className={`font-semibold ${noti.is_read ? 'text-gray-600' : 'text-[#111c44]'}`}>
                          {noti.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 truncate max-w-[300px]" title={noti.body}>
                      {noti.body || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                          {noti.recipientName.charAt(0).toUpperCase()}
                        </div>
                        {noti.recipientName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(noti.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
                    </td>
                    <td className="px-6 py-4 text-center">
                      {noti.is_read ? (
                        <span className="px-3 py-1.5 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          อ่านแล้ว
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 border border-blue-200 bg-blue-50 text-[#4318FF] rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                          ยังไม่อ่าน
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                      </div>
                      <p className="text-gray-500 font-medium">ไม่พบประวัติการแจ้งเตือน</p>
                      <p className="text-sm text-gray-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเปลี่ยนสถานะตัวกรองดูอีกครั้ง</p>
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