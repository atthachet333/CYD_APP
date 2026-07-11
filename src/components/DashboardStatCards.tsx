"use client";

import { useState } from "react";

export default function DashboardStatCards({ data }: { data: any }) {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const cards = [
    { 
      id: "profiles", label: "รายชื่อทั้งหมด", value: data.totalProfiles, 
      color: "text-orange-400", bg: "bg-orange-50", desc: "ข้อมูลจากระบบลงทะเบียนพนักงาน",
      listData: data.profilesList 
    },
    { 
      id: "users", label: "ผู้ใช้งานทั้งหมด", value: data.totalUsers, 
      color: "text-purple-500", bg: "bg-purple-50", desc: "บัญชีผู้ใช้งานภายในระบบ",
      listData: data.usersList 
    },
    { 
      id: "companies", label: "จำนวนบริษัท", value: data.totalCompanies, 
      color: "text-teal-400", bg: "bg-teal-50", desc: "บริษัท/คู่ค้าทั้งหมดในฐานข้อมูล",
      listData: data.companiesList 
    },
    { 
      id: "uploads", label: "อัปโหลดเดือนนี้", value: data.uploadsThisMonth, 
      color: "text-red-400", bg: "bg-red-50", desc: "สถิติการอัปโหลดข้อมูลเดือนปัจจุบัน",
      listData: [] 
    },
  ];

  return (
    <>
      {/* 4 กล่องสถิติ */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-4">
        {cards.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 relative group transition-all hover:shadow-md">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <div className={`w-14 h-14 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  <svg className={`w-7 h-7 ${item.color}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500 mb-1">{item.label}</p>
                  <p className="text-3xl font-extrabold text-[#111c44] leading-none">{item.value.toLocaleString()}</p>
                </div>
              </div>
              
              <button 
                onClick={() => setActiveModal(item.id)}
                className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[#4318FF] hover:bg-blue-50 transition-all cursor-pointer border border-gray-100 hover:border-blue-200"
                title={`ดูรายละเอียด ${item.label}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-4">{item.desc}</p>
          </div>
        ))}
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f2b6f]/60 p-2 backdrop-blur-sm sm:p-4 md:p-8">
          <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200 sm:max-h-[90dvh]">
            
            <div className="bg-[#1e3a8a] px-6 py-4 flex justify-between items-center text-white shrink-0">
              <h2 className="font-extrabold text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                รายละเอียดข้อมูล: {cards.find(c => c.id === activeModal)?.label}
              </h2>
              <button onClick={() => setActiveModal(null)} className="text-blue-200 hover:text-white transition-colors bg-white/10 p-1.5 rounded-lg hover:bg-red-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-0 overflow-y-auto bg-gray-50 flex-1 relative">
              
              {activeModal === "profiles" && (
                <div className="overflow-x-auto min-h-full">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-100 text-[#111c44] sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="p-4 font-bold border-b border-gray-200">รหัสพนักงาน</th>
                        <th className="p-4 font-bold border-b border-gray-200">ชื่อ-นามสกุล</th>
                        <th className="p-4 font-bold border-b border-gray-200">ยอดค้างชำระ</th>
                        <th className="p-4 font-bold border-b border-gray-200">พาสปอร์ตหมดอายุ</th>
                        <th className="p-4 font-bold border-b border-gray-200">วีซ่าหมดอายุ</th>
                        <th className="p-4 font-bold border-b border-gray-200">ใบอนุญาตทำงาน</th>
                        <th className="p-4 font-bold border-b border-gray-200">รายงานตัว 90 วัน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white text-[13px]">
                      {cards.find(c => c.id === "profiles")?.listData.map((p: any, i: number) => (
                        <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                          <td className="p-4 text-gray-500 font-medium">{p.emp_code || '-'}</td>
                          <td className="p-4 font-bold text-gray-800">{p.first_name_th} {p.last_name_th}</td>
                          <td className="p-4 font-bold">
                            {Number(p.debt_amount) > 0 
                              ? <span className="text-red-500 bg-red-50 px-2.5 py-1 rounded-md">{Number(p.debt_amount).toLocaleString()} ฿</span> 
                              : <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-md">0 ฿</span>}
                          </td>
                          <td className="p-4 text-gray-600">{p.passport_expiry_date ? new Date(p.passport_expiry_date).toLocaleDateString('th-TH') : '-'}</td>
                          <td className="p-4 text-gray-600">{p.visa_expiry_date ? new Date(p.visa_expiry_date).toLocaleDateString('th-TH') : '-'}</td>
                          <td className="p-4 text-gray-600">{p.work_permit_expiry_date ? new Date(p.work_permit_expiry_date).toLocaleDateString('th-TH') : '-'}</td>
                          <td className="p-4 text-gray-600">{p.ninety_day_report_date ? new Date(p.ninety_day_report_date).toLocaleDateString('th-TH') : '-'}</td>
                        </tr>
                      ))}
                      {cards.find(c => c.id === "profiles")?.listData.length === 0 && (
                        <tr><td colSpan={7} className="p-10 text-center text-gray-400">ยังไม่มีข้อมูลในระบบ</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeModal === "users" && (
                <div className="overflow-x-auto min-h-full">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-100 text-[#111c44] sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="p-4 font-bold border-b border-gray-200">Username</th>
                        <th className="p-4 font-bold border-b border-gray-200">ชื่อแสดงผล / บริษัท</th>
                        <th className="p-4 font-bold border-b border-gray-200">อีเมลที่ติดต่อได้</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {cards.find(c => c.id === "users")?.listData.map((u: any, i: number) => (
                        <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                          <td className="p-4 font-extrabold text-[#4318FF]">{u.username}</td>
                          <td className="p-4 text-gray-700 font-medium">{u.name || '-'}</td>
                          <td className="p-4 text-gray-500">{u.email || '-'}</td>
                        </tr>
                      ))}
                      {cards.find(c => c.id === "users")?.listData.length === 0 && (
                        <tr><td colSpan={3} className="p-10 text-center text-gray-400">ยังไม่มีข้อมูลในระบบ</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeModal === "companies" && (
                <div className="overflow-x-auto min-h-full">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-100 text-[#111c44] sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="p-4 font-bold border-b border-gray-200 w-16 text-center">ลำดับ</th>
                        <th className="p-4 font-bold border-b border-gray-200">ชื่อบริษัท / สาขา</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {cards.find(c => c.id === "companies")?.listData.map((c: any, i: number) => (
                        <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                          <td className="p-4 text-center text-gray-400 font-bold">{i + 1}</td>
                          <td className="p-4 font-bold text-gray-800">{c.company_name}</td>
                        </tr>
                      ))}
                      {cards.find(c => c.id === "companies")?.listData.length === 0 && (
                        <tr><td colSpan={2} className="p-10 text-center text-gray-400">ยังไม่มีข้อมูลในระบบ</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeModal === "uploads" && (
                <div className="p-12 flex flex-col items-center justify-center text-gray-400 min-h-[50vh]">
                  <svg className="w-16 h-16 mb-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  <p className="font-medium text-lg text-gray-500">ฟังก์ชันสำหรับดึงข้อมูลอัปโหลดรายวันกำลังอยู่ในช่วงพัฒนา...</p>
                </div>
              )}
            </div>
            
            <div className="bg-gray-100 p-4 border-t border-gray-200 flex justify-end shrink-0">
              <button 
                onClick={() => setActiveModal(null)} 
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
