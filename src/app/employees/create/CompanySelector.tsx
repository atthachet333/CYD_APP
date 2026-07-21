"use client";

import { useState } from "react";
import { createCompanyAction } from "@/app/actions/company";

type Company = {
  id: number;
  company_name: string;
};

export default function CompanySelector({ 
  initialCompanies, 
  defaultCompanyId = "" 
}: { 
  initialCompanies: Company[], 
  defaultCompanyId?: string | number 
}) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [selectedId, setSelectedId] = useState<string>(defaultCompanyId.toString());
  const [isAdding, setIsAdding] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSaveNewCompany = async () => {
    if (!newCompanyName.trim()) return;
    
    setLoading(true);
    const res = await createCompanyAction(newCompanyName);
    
    if (res.company) {
      // Add the new company to the list and sort alphabetically
      const updatedCompanies = [...companies, res.company].sort((a, b) => 
        a.company_name.localeCompare(b.company_name)
      );
      
      // Remove duplicates just in case
      const uniqueCompanies = Array.from(new Map(updatedCompanies.map(c => [c.id, c])).values());
      
      setCompanies(uniqueCompanies);
      setSelectedId(res.company.id.toString());
      setIsAdding(false);
      setNewCompanyName("");
    } else {
      alert(res.error || "เกิดข้อผิดพลาดในการบันทึกบริษัท");
    }
    setLoading(false);
  };

  return (
    <div>
      <label className="block font-bold text-gray-700 mb-1.5">บริษัท <span className="text-red-500">*</span></label>
      
      {isAdding ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
          <input 
            type="text" 
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            placeholder="กรอกชื่อบริษัทใหม่..." 
            autoFocus
            className="flex-1 px-4 py-3 border border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none bg-orange-50/30 transition-colors"
          />
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={handleSaveNewCompany}
              disabled={loading || !newCompanyName.trim()}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "บันทึกบริษัท"}
            </button>
            <button 
              type="button" 
              onClick={() => { setIsAdding(false); setNewCompanyName(""); }}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors min-w-[80px]"
            >
              ยกเลิก
            </button>
          </div>
          {/* Ensure the form doesn't submit a blank company_id when adding mode is open */}
          <input type="hidden" name="company_id" value={selectedId} />
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-in fade-in duration-200">
          <div className="flex-1 relative">
            <select 
              name="company_id" 
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              required 
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-colors appearance-none"
            >
              <option value="">-- เลือกบริษัท --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setIsAdding(true)}
            className="px-5 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center whitespace-nowrap gap-2 border border-blue-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มบริษัท
          </button>
        </div>
      )}
    </div>
  );
}
