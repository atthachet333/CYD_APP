"use client";

import { useState } from "react";

export default function CompanySelector({ companies, defaultValue = "" }: { companies: string[], defaultValue?: string }) {
  const [isNew, setIsNew] = useState(false);

  return (
    <div>
      <label className="flex items-center justify-between font-bold text-gray-700 mb-1.5">
        <span>บริษัท <span className="text-red-500">*</span></span>
        <button 
          type="button" 
          onClick={() => setIsNew(!isNew)}
          className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors shadow-sm"
        >
          {isNew ? "เลือกบริษัทที่มีอยู่" : "+ เพิ่มบริษัท"}
        </button>
      </label>
      
      {isNew ? (
        <input 
          type="text" 
          name="company_name_val" 
          required 
          autoFocus
          placeholder="กรอกชื่อบริษัทใหม่..." 
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white transition-colors"
        />
      ) : (
        <div className="relative">
          <input 
            type="text"
            list="companies_list"
            name="company_name_val" 
            required 
            defaultValue={defaultValue}
            autoComplete="off"
            placeholder="-- พิมพ์เพื่อค้นหา หรือ เลือกบริษัท --" 
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-colors"
          />
          <datalist id="companies_list">
            {companies.map((cName, idx) => (
              <option key={idx} value={cName} />
            ))}
          </datalist>
        </div>
      )}
    </div>
  );
}
