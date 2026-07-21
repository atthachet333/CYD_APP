// src/app/employees/create/CompanySelectField.tsx
"use client";

import { useState } from "react";

interface Company {
  id: number;
  company_name: string;
}

interface CompanySelectFieldProps {
  initialCompanies: Company[];
  onAddCompany: (name: string) => Promise<{ id: number; company_name: string } | null>;
}

export default function CompanySelectField({
  initialCompanies,
  onAddCompany,
}: CompanySelectFieldProps) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [selectedValue, setSelectedValue] = useState<string>("");

  async function handleAddCompany() {
    // แสดงหน้าต่างให้พิมพ์ชื่อบริษัทใหม่บนหน้าจอ
    const companyName = prompt("กรอกชื่อบริษัทใหม่ที่คุณต้องการบันทึกเข้าฐานข้อมูล:");
    if (!companyName || !companyName.trim()) return;

    try {
      // สั่งให้ข้อมูลวิ่งข้ามไปบันทึกลง Database ฝั่ง Server
      const newCompany = await onAddCompany(companyName.trim());
      
      if (newCompany) {
        // แทรกรวมเข้าลิสต์ตัวเลือกทันทีโดยผู้ใช้ไม่ต้องกดรีเฟรชหน้าเว็บ
        setCompanies((prev) => [...prev, newCompany]);
        setSelectedValue(String(newCompany.id)); // ปรับให้ระบบเลือกบริษัทที่เพิ่งเพิ่มให้เลย
        alert("บันทึกบริษัทใหม่เข้าฐานข้อมูลสำเร็จเรียบร้อยแล้ว!");
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึกบริษัท");
      }
    } catch (error) {
      console.error("Error adding company:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    }
  }

  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-2">เลือกบริษัทสังกัด</label>
      <div className="flex items-center gap-2">
        <select
          name="company_id"
          value={selectedValue}
          onChange={(e) => setSelectedValue(e.target.value)}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white font-medium text-gray-700"
        >
          <option value="">-- เลือกบริษัท --</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </select>
        
        {/* ปุ่มเพิ่มบริษัทสีเขียวตามเรฟเฟอเรนซ์ */}
        <button
          type="button"
          onClick={handleAddCompany}
          className="px-5 py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-500/10 hover:bg-emerald-700 transition-all whitespace-nowrap active:scale-95"
        >
          + เพิ่มบริษัท
        </button>
      </div>
    </div>
  );
}