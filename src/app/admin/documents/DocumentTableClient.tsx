"use client";

import { useState } from "react";

export default function DocumentTableClient({ initialData }: { initialData: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showStarredOnly, setShowStarredOnly] = useState(true); // ตั้งค่าเริ่มต้นให้โชว์เฉพาะไฟล์ติดดาวตามชื่อเมนู

  // ฟังก์ชันกรองข้อมูล
  const filteredData = initialData.filter((doc) => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = 
      doc.title.toLowerCase().includes(searchLower) ||
      doc.doc_no.toLowerCase().includes(searchLower) ||
      doc.file_name.toLowerCase().includes(searchLower) ||
      doc.categoryName.toLowerCase().includes(searchLower) ||
      doc.uploaderName.toLowerCase().includes(searchLower);
      
    const matchStar = showStarredOnly ? doc.is_starred === true : true;

    return matchSearch && matchStar;
  });

  // ฟังก์ชันแปลงขนาดไฟล์ให้ดูง่าย (KB, MB)
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // เลือกสีของไอคอนตามนามสกุลไฟล์
  const getFileIconColor = (ext: string) => {
    const extension = ext.toLowerCase().replace('.', '');
    if (['pdf'].includes(extension)) return 'text-red-500 bg-red-50';
    if (['xls', 'xlsx', 'csv'].includes(extension)) return 'text-green-600 bg-green-50';
    if (['doc', 'docx'].includes(extension)) return 'text-blue-600 bg-blue-50';
    if (['jpg', 'jpeg', 'png'].includes(extension)) return 'text-purple-500 bg-purple-50';
    return 'text-gray-500 bg-gray-50';
  };

  return (
    <div className="space-y-6">
      {/* กล่องค้นหาและตัวกรอง */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#4318FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              ค้นหาเอกสาร
            </h2>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                placeholder="พิมพ์ชื่อเอกสาร, เลขที่, หมวดหมู่ หรือชื่อผู้อัปโหลด..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4318FF]/40 transition-all text-sm text-gray-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="w-full md:w-auto">
            <button 
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${
                showStarredOnly 
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className={`w-5 h-5 ${showStarredOnly ? 'text-amber-400 fill-amber-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
              {showStarredOnly ? 'แสดงเฉพาะไฟล์ติดดาว' : 'แสดงไฟล์ทั้งหมด'}
            </button>
          </div>
        </div>
      </div>

      {/* ตารางแสดงข้อมูล */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#f8fafc] text-gray-600 border-b border-gray-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold w-10 text-center"></th>
                <th className="px-6 py-4 font-bold">ชื่อเอกสาร / รหัส</th>
                <th className="px-6 py-4 font-bold">หมวดหมู่</th>
                <th className="px-6 py-4 font-bold">ขนาดไฟล์</th>
                <th className="px-6 py-4 font-bold">อัปโหลดโดย</th>
                <th className="px-6 py-4 font-bold">วันที่อัปโหลด</th>
                <th className="px-6 py-4 font-bold text-center">ดาวน์โหลด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((doc) => {
                  const iconStyle = getFileIconColor(doc.file_ext);
                  return (
                    <tr key={doc.id} className="hover:bg-[#f8fafc] transition-colors group">
                      <td className="px-6 py-4 text-center">
                        <button className="focus:outline-none" title={doc.is_starred ? "นำดาวออก" : "ติดดาว"}>
                          <svg className={`w-5 h-5 transition-transform hover:scale-110 ${doc.is_starred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-amber-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconStyle}`}>
                            <span className="text-[10px] font-black uppercase">{doc.file_ext?.replace('.', '') || 'FILE'}</span>
                          </div>
                          <div>
                            <div className="text-gray-800 font-bold max-w-[200px] lg:max-w-[300px] truncate" title={doc.title}>{doc.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{doc.doc_no}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{doc.categoryName}</td>
                      <td className="px-6 py-4 text-gray-500">{formatBytes(doc.file_size)}</td>
                      <td className="px-6 py-4">
                        <div className="text-gray-700 font-medium">{doc.uploaderName}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(doc.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-[#4318FF] hover:text-white hover:bg-[#4318FF] border border-[#4318FF] p-2 rounded-lg transition-all duration-200" title="ดาวน์โหลดไฟล์">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <p className="text-gray-500 font-medium">ไม่พบเอกสาร</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {showStarredOnly ? "ยังไม่มีไฟล์ที่ถูกติดดาวในระบบ" : "ไม่พบข้อมูลที่ตรงกับการค้นหา"}
                      </p>
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