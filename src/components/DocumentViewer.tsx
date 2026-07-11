"use client";

import SecureDocumentButton from "@/components/SecureDocumentButton";

type DocumentType = "passport" | "visa" | "work_permit" | "ninety_day";

type Props = {
  empId: string;
  docType: string;
  title: string;
};

const DOCUMENT_TYPE_MAP: Record<string, DocumentType> = {
  PP: "passport",
  pp: "passport",
  passport: "passport",
  VS: "visa",
  vs: "visa",
  visa: "visa",
  Work_permit: "work_permit",
  work_permit: "work_permit",
  workpermit: "work_permit",
  "90D": "ninety_day",
  "90d": "ninety_day",
  ninety_day: "ninety_day",
};

export default function DocumentViewer({ empId, docType, title }: Props) {
  const documentType = DOCUMENT_TYPE_MAP[docType];

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <h4 className="font-bold text-gray-800 mb-4">{title}</h4>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {documentType ? (
          <SecureDocumentButton
            employeeId={empId}
            documentType={documentType}
            className="py-2.5 rounded-xl font-semibold text-[#1e5bff] bg-[#f0f4ff] hover:bg-[#e0eaff] transition-colors"
          >
            ดูเอกสาร
          </SecureDocumentButton>
        ) : (
          <button
            type="button"
            disabled
            className="py-2.5 rounded-xl font-semibold text-gray-400 bg-gray-100 cursor-not-allowed"
          >
            ไม่พบประเภทเอกสาร
          </button>
        )}

        <button
          type="button"
          className="py-2.5 rounded-xl font-semibold text-white bg-[#1a56db] hover:bg-[#1546b3] shadow-sm transition-colors"
        >
          แก้ไข
        </button>

        <button
          type="button"
          className="py-2.5 rounded-xl font-semibold text-[#1e5bff] bg-[#f0f4ff] hover:bg-[#e0eaff] transition-colors"
        >
          ย้ายบริษัท
        </button>

        <button
          type="button"
          className="py-2.5 rounded-xl font-semibold text-[#e02424] bg-[#fdf2f2] hover:bg-[#fde8e8] transition-colors"
        >
          ลบ
        </button>
      </div>
    </div>
  );
}
