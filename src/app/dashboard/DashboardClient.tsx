"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardClient({ 
  statsData, usersData, companiesData, employeesData, uploadsData, fullName, chartData 
}: any) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [viewEmployee, setViewEmployee] = useState<any | null>(null);

  useEffect(() => {
    if (!activeModal && !viewEmployee) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setActiveModal(null);
      setViewEmployee(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeModal, viewEmployee]);

  const formatShortCompany = (name: string) => {
    if (!name) return "-";
    const match = name.match(/\(([^)]+)\)/);
    return match ? match[1] : name.substring(0, 20);
  };

  const stats = [
    { id: "employees", title: "รายชื่ออัพโหลดล่าสุด", value: statsData?.totalEmployees || "0", desc: "พนักงาน MOU/Thai", iconColor: "text-blue-600", bgColor: "bg-blue-50", chartColor: "bg-gradient-to-t from-blue-600 to-cyan-400", hoverRing: "hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/20", dotColor: "bg-blue-500", icon: "👥" },
    { id: "users", title: "ผู้ใช้งานในระบบ", value: statsData?.totalUsers || "0", desc: "Admin, Staff, Customer", iconColor: "text-purple-600", bgColor: "bg-purple-50", chartColor: "bg-gradient-to-t from-purple-600 to-fuchsia-400", hoverRing: "hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/20", dotColor: "bg-purple-500", icon: "🔑" },
    { id: "companies", title: "บริษัทในเครือ", value: statsData?.totalCompanies || "0", desc: "นิติบุคคลที่ลงทะเบียน", iconColor: "text-emerald-600", bgColor: "bg-emerald-50", chartColor: "bg-gradient-to-t from-emerald-600 to-teal-400", hoverRing: "hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/20", dotColor: "bg-emerald-500", icon: "🏢" },
    { id: "uploads", title: "อัปโหลดเดือนนี้", value: statsData?.totalUploads || "0", desc: "การอัปโหลดปัจจุบัน", iconColor: "text-amber-500", bgColor: "bg-amber-50", chartColor: "bg-gradient-to-t from-amber-500 to-orange-400", hoverRing: "hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/20", dotColor: "bg-amber-500", icon: "📂" },
  ];

  const MiniBarChart = ({ color }: { color: string }) => {
    const heights = [45, 80, 55, 100, 70, 90, 60];
    return (
      <div className="flex items-end gap-[2px] h-6 opacity-90 ml-2">
        {heights.map((h, i) => (
          <div key={i} className={`w-1.5 rounded-sm ${color}`} style={{ height: `${h}%` }}></div>
        ))}
      </div>
    );
  };

  const branchStats = (chartData || [])
    .filter((comp: any) => {
      const cName = String(comp.company_name || "").trim();
      return !cName.includes("ประเทศไทย"); 
    })
    .map((comp: any) => {
      return { name: formatShortCompany(comp.company_name), count: comp.count, fullName: comp.company_name };
    });

  const topBranchStats = [...branchStats].sort((a, b) => b.count - a.count).slice(0, 5); 
  const maxCount = topBranchStats.length > 0 ? Math.max(...topBranchStats.map((c: any) => c.count)) : 1;

  return (
    <div className="mx-auto min-h-screen w-full max-w-screen-2xl bg-gray-50 p-2 pb-12 font-sans text-gray-800 sm:p-3 sm:pb-12 md:p-4 md:pb-12">
      
      {/* Welcome Banner */}
      <div className="mb-3 bg-gradient-to-br from-[#0a1e4d] via-[#0f2b6f] to-blue-800 rounded-xl p-3 md:p-5 shadow-sm relative overflow-hidden border border-blue-700/50">
        <div className="absolute -top-24 -right-10 w-64 h-64 bg-blue-400 rounded-full filter blur-3xl opacity-20"></div>
        <div className="relative z-10 flex flex-col justify-center">
          <div className="md:pr-56">
            <h1 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-white">
              ยินดีต้อนรับสู่ระบบจัดการและตรวจสอบเอกสาร
            </h1>
            <p className="text-xs md:text-sm text-blue-200 font-medium flex items-center gap-1.5 mt-0.5">
              คุณ {fullName || "ผู้ใช้งาน"} <span className="animate-bounce inline-block">👋</span>
            </p>
          </div>
        </div>
      </div>

      {/* 4 การ์ดสถิติ (คลิกแล้วเปิด Modal ทันที) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-3">
        {stats.map((card) => (
          <div 
            key={card.id} 
            className={`bg-white p-3.5 md:p-4 rounded-xl border border-gray-200 shadow-sm relative transition-all duration-300 hover:-translate-y-1 cursor-pointer group ${card.hoverRing}`} 
            onClick={() => setActiveModal(card.id)}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-gray-400 font-bold text-[10px] md:text-[11px] uppercase block mb-1 group-hover:text-gray-700 transition-colors">{card.title}</span>
                <div className="flex items-end gap-2">
                  <div className="text-2xl md:text-3xl font-black text-[#0a1e4d] tracking-tight">{card.value}</div>
                  <MiniBarChart color={card.chartColor} />
                </div>
              </div>
              <div className={`w-9 h-9 rounded-xl ${card.bgColor} ${card.iconColor} flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
              <span className={`w-2 h-2 rounded-full ${card.dotColor} shadow-sm`}></span>
              <p className="text-[10px] md:text-xs text-gray-500 font-medium truncate">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* ตารางรายชื่อ (10 คน) */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h2 className="text-sm font-extrabold text-[#0a1e4d] flex items-center gap-1.5">
              รายชื่ออัพโหลดล่าสุด
            </h2>
          </div>
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[550px]">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase border-b border-gray-100">
                  <th className="p-2.5 pl-4">รหัส</th>
                  <th className="p-2.5">ชื่อ-นามสกุล</th>
                  <th className="p-2.5">สาขา</th>
                  <th className="p-2.5 pr-4 text-center">ดูข้อมูล</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs text-gray-700 font-medium">
                {employeesData.map((emp: any) => (
                  <tr key={`${emp.empCode}-${emp.name}-${emp.company}`} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-2.5 pl-4 font-black text-[#0f2b6f]">{emp.empCode}</td>
                    <td className="p-2.5"><div className="truncate max-w-[120px]">{emp.name}</div></td>
                    <td className="p-2.5 text-gray-400"><div className="truncate max-w-[150px]">{formatShortCompany(emp.company)}</div></td>
                    <td className="p-2.5 pr-4 text-center">
                      <button type="button" onClick={() => setViewEmployee(emp)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-blue-500 mx-auto transition-all">
                         <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* กราฟแท่งสถิติ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-extrabold text-[#0a1e4d] flex items-center gap-1.5">
              สถิติอัปโหลดรายชื่อภายในเดือนนี้
            </h2>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between relative">
            {topBranchStats.length > 0 ? (
              <div className="flex-1 flex items-end justify-around gap-2 mt-2 min-h-[250px] pb-5 relative">
                {topBranchStats.map((stat: any) => {
                  const heightPercent = (stat.count / maxCount) * 100;
                  return (
                    <div key={stat.fullName} className="relative z-10 w-full max-w-[30px] flex flex-col justify-end items-center group h-full">
                      <span className="text-[10px] font-bold text-white bg-[#0f2b6f] px-1.5 py-0.5 rounded shadow absolute -top-6 opacity-0 group-hover:opacity-100 transition-all z-20">{stat.count}</span>
                      <div className="w-full bg-gradient-to-t from-[#0f2b6f] to-cyan-400 rounded-t-sm transition-all duration-300 hover:from-blue-600 hover:to-cyan-300 cursor-pointer" style={{ height: `${Math.max(heightPercent, 10)}%` }}></div>
                      <div className="absolute -bottom-6 w-[60px] text-center"><span className="text-[9px] font-bold text-gray-400 truncate block px-0.5 group-hover:text-[#0f2b6f]">{stat.name}</span></div>
                    </div>
                  )
                })}
              </div>
            ) : (<div className="flex-1 flex items-center justify-center text-gray-400 text-xs min-h-[250px]">ยังไม่มีข้อมูล</div>)}
          </div>
        </div>
      </div>

      {/* ======================= MODAL ทั้งหมด ======================= */}
      
      {/* 🟢 1. MODAL: พนักงาน (Employees) */}
      {activeModal === "employees" && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setActiveModal(null)}></div>
          <div role="dialog" aria-modal="true" aria-label="รายชื่อพนักงานทั้งหมด" className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 md:p-6 bg-gradient-to-r from-blue-600 to-cyan-500 flex justify-between items-center text-white relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full filter blur-xl"></div>
              <div className="relative z-10 flex items-center space-x-4">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">👥</div>
                <div>
                  <p className="text-[10px] md:text-xs text-blue-100 font-bold uppercase tracking-wider mb-0.5">พนักงานที่อัปโหลดล่าสุด</p>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg md:text-xl font-black tracking-tight">รายชื่อพนักงานทั้งหมด</h2>
                    <span className="bg-white text-blue-600 text-xs font-black px-2 py-0.5 rounded-full shadow-sm">{statsData?.totalEmployees || 0}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all duration-200 text-xs font-bold relative z-10">✕</button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-white">
              <table className="min-w-[640px] w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr className="text-slate-400 font-extrabold text-[10px] md:text-xs uppercase tracking-wider">
                    <th className="p-4 pl-6">รหัสพนักงาน</th>
                    <th className="p-4">ชื่อ - นามสกุล</th>
                    <th className="p-4">บริษัท / สาขา</th>
                    <th className="p-4 text-center">พาสปอร์ต</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-xs md:text-sm">
                  {employeesData.map((emp: any) => (
                    <tr key={`${emp.empCode}-${emp.name}-${emp.company}`} className="hover:bg-blue-50/40">
                      <td className="p-4 pl-6 font-bold text-blue-700">{emp.empCode}</td>
                      <td className="p-4">{emp.name}</td>
                      <td className="p-4 text-slate-500">{emp.company}</td>
                      <td className="p-4 text-center"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{emp.passport}</span></td>
                    </tr>
                  ))}
                  {employeesData.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-slate-400 font-bold">ไม่มีข้อมูลพนักงาน</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/70">
              <Link href="/employees" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-extrabold rounded-xl transition-all shadow-md">ไปหน้าจัดการพนักงาน →</Link>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 2. MODAL: ผู้ใช้งาน (Users) */}
      {activeModal === "users" && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setActiveModal(null)}></div>
          <div role="dialog" aria-modal="true" aria-label="ผู้ใช้งานในระบบทั้งหมด" className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 md:p-6 bg-gradient-to-r from-purple-600 to-fuchsia-500 flex justify-between items-center text-white relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full filter blur-xl"></div>
              <div className="relative z-10 flex items-center space-x-4">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">🔑</div>
                <div>
                  <p className="text-[10px] md:text-xs text-purple-100 font-bold uppercase tracking-wider mb-0.5">Admin, Staff, Customer</p>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg md:text-xl font-black tracking-tight">ผู้ใช้งานในระบบทั้งหมด</h2>
                    <span className="bg-white text-purple-600 text-xs font-black px-2 py-0.5 rounded-full shadow-sm">{statsData?.totalUsers || 0}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all duration-200 text-xs font-bold relative z-10">✕</button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-white">
              <table className="min-w-[640px] w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr className="text-slate-400 font-extrabold text-[10px] md:text-xs uppercase tracking-wider">
                    <th className="p-4 pl-6">ชื่อผู้ใช้งาน (Username)</th>
                    <th className="p-4">ชื่อ - นามสกุล</th>
                    <th className="p-4 text-center">สิทธิ์การใช้งาน (Role)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-xs md:text-sm">
                  {usersData.map((usr: any) => (
                    <tr key={usr.username} className="hover:bg-purple-50/40">
                      <td className="p-4 pl-6 font-bold text-slate-800">{usr.username}</td>
                      <td className="p-4">{usr.full_name}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                          usr.roleName === 'ADMIN' ? 'bg-rose-100 text-rose-700' :
                          usr.roleName === 'STAFF' ? 'bg-blue-100 text-blue-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>{usr.roleName}</span>
                      </td>
                    </tr>
                  ))}
                  {usersData.length === 0 && <tr><td colSpan={3} className="p-12 text-center text-slate-400 font-bold">ไม่มีข้อมูลผู้ใช้งาน</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/70">
              <Link href="/admin/users" className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs md:text-sm font-extrabold rounded-xl transition-all shadow-md">ไปหน้าจัดการผู้ใช้ →</Link>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 3. MODAL: อัปโหลด (Uploads) */}
      {activeModal === "uploads" && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setActiveModal(null)}></div>
          <div role="dialog" aria-modal="true" aria-label="รายการอัปโหลดเดือนนี้" className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 md:p-6 bg-gradient-to-r from-amber-500 to-orange-400 flex justify-between items-center text-white relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full filter blur-xl"></div>
              <div className="relative z-10 flex items-center space-x-4">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">📂</div>
                <div>
                  <p className="text-[10px] md:text-xs text-amber-100 font-bold uppercase tracking-wider mb-0.5">การอัปโหลดปัจจุบัน</p>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg md:text-xl font-black tracking-tight">รายการอัปโหลดเดือนนี้</h2>
                    <span className="bg-white text-amber-600 text-xs font-black px-2 py-0.5 rounded-full shadow-sm">{statsData?.totalUploads || 0}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all duration-200 text-xs font-bold relative z-10">✕</button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-white">
              <table className="min-w-[640px] w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr className="text-slate-400 font-extrabold text-[10px] md:text-xs uppercase tracking-wider">
                    <th className="p-4 pl-6">ชื่อไฟล์</th>
                    <th className="p-4">หมวดหมู่</th>
                    <th className="p-4 text-center">วันที่อัปโหลด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-xs md:text-sm">
                  {uploadsData.map((up: any) => (
                    <tr key={`${up.file}-${up.category}-${up.date}`} className="hover:bg-amber-50/40">
                      <td className="p-4 pl-6 font-bold text-slate-800">{up.file}</td>
                      <td className="p-4 text-slate-500">{up.category}</td>
                      <td className="p-4 text-center text-slate-500 font-mono text-xs">{up.date}</td>
                    </tr>
                  ))}
                  {uploadsData.length === 0 && <tr><td colSpan={3} className="p-12 text-center text-slate-400 font-bold">ไม่มีประวัติการอัปโหลด</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/70">
              <Link href="/import" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs md:text-sm font-extrabold rounded-xl transition-all shadow-md">ไปหน้าอัปโหลดเอกสาร →</Link>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 4. MODAL: บริษัท (Companies - เหมือนเดิม) */}
      {activeModal === "companies" && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setActiveModal(null)}></div>
          <div role="dialog" aria-modal="true" aria-label="บริษัททั้งหมด" className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 md:p-6 bg-gradient-to-r from-[#0a1e4d] via-[#0f2b6f] to-blue-800 flex justify-between items-center text-white relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full filter blur-xl"></div>
              <div className="relative z-10 flex items-center space-x-4">
                <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-xl shadow-inner">🏢</div>
                <div>
                  <p className="text-[10px] md:text-xs text-blue-200 font-bold uppercase tracking-wider mb-0.5">บริษัทในฐานข้อมูลระบบ</p>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg md:text-xl font-black tracking-tight">จำนวนบริษัททั้งหมด</h2>
                    <span className="bg-cyan-400 text-[#0a1e4d] text-xs font-black px-2 py-0.5 rounded-full shadow-sm">{companiesData.length}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/80 text-white flex items-center justify-center border border-white/10 hover:border-transparent transition-all duration-200 text-xs font-bold shadow-sm relative z-10">✕</button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-white">
              <table className="min-w-[640px] w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 backdrop-blur-sm z-10">
                  <tr className="text-slate-400 font-extrabold text-[10px] md:text-xs uppercase tracking-wider">
                    <th className="p-4 pl-6 w-full">นิตินัย / นิติบุคคล</th>
                    <th className="p-4 text-center w-36">จำนวนรายชื่อ</th>
                    <th className="p-4 text-left w-56">วันที่เพิ่มข้อมูลในระบบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-xs md:text-sm">
                  {companiesData.map((comp: any) => (
                    <tr key={comp.id} className="transition-colors duration-150 hover:bg-blue-50/40 group odd:bg-white even:bg-slate-50/30">
                      <td className="p-4 pl-6 font-bold text-slate-800 flex items-center gap-2.5">
                        <span className="opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200 text-sm">🏢</span>
                        <span className="truncate max-w-[450px] group-hover:text-blue-700 transition-colors">{comp.company_name}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-black tracking-tight border min-w-[50px] text-center ${comp.employee_count > 0 ? 'bg-blue-50 border-blue-100 text-blue-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                          {comp.employee_count || 0}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-xs text-left group-hover:text-slate-600 transition-colors">
                        {comp.created_at || "-"}
                      </td>
                    </tr>
                  ))}
                  {companiesData.length === 0 && <tr><td colSpan={3} className="p-12 text-center text-slate-400 font-bold">ไม่มีข้อมูลบริษัทลงทะเบียนไว้ในระบบ</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/70">
              <Link href="/companies" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 hover:from-blue-700 hover:to-indigo-900 text-white text-xs md:text-sm font-extrabold rounded-xl transition-all duration-200 shadow-md shadow-blue-600/20 active:scale-95 border border-blue-700/30 tracking-wide">ไปหน้าจัดการบริษัท →</Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL พนักงาน (คลิกจากตารางด้านล่าง) */}
      {viewEmployee && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewEmployee(null)}></div>
          <div role="dialog" aria-modal="true" aria-label="รายละเอียดข้อมูลพนักงาน" className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl animate-in zoom-in duration-150">
            <div className="bg-gradient-to-r from-[#0a1e4d] to-[#1e4bb5] p-4 flex justify-between items-center text-white">
              <div>
                <p className="text-[10px] text-cyan-200 font-bold uppercase tracking-wider mb-0.5">รายละเอียดข้อมูลพนักงาน</p>
                <h3 className="text-base font-black tracking-tight">{viewEmployee.empCode || "N/A"}</h3>
              </div>
              <button type="button" onClick={() => setViewEmployee(null)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">✕</button>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3 text-xs font-medium text-gray-700">
              <div><span className="text-[10px] text-gray-400 block mb-1 font-bold">ชื่อ-นามสกุล</span><div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-bold text-gray-800">{viewEmployee.name || "-"}</div></div>
              <div><span className="text-[10px] text-gray-400 block mb-1 font-bold">บริษัท / สาขา</span><div className="truncate rounded-lg border border-gray-100 bg-gray-50 p-2.5 text-gray-600" title={viewEmployee.company || "-"}>{viewEmployee.company || "-"}</div></div>
            </div>
            <div className="p-3 border-t border-gray-100 flex justify-end bg-gray-50">
              <button type="button" onClick={() => setViewEmployee(null)} className="px-5 py-2 bg-[#0a1e4d] text-white text-xs font-bold rounded-lg">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
