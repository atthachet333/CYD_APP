"use client";

import type { ReactNode } from "react";

type DocumentType = "passport" | "visa" | "work_permit" | "ninety_day";

export default function SecureDocumentButton({
  employeeId,
  documentType,
  className,
  children = "เปิดดูไฟล์",
}: {
  employeeId?: number | string | null;
  documentType: DocumentType;
  className?: string;
  children?: ReactNode;
}) {
  const disabled = !employeeId;

  const openDocument = () => {
    if (!employeeId) {
      alert("ไม่พบรหัสพนักงานสำหรับเปิดเอกสาร");
      return;
    }

    const viewUrl = `/api/documents/view?employeeId=${encodeURIComponent(String(employeeId))}&documentType=${documentType}`;

    console.log("[document-view]", { documentType, employeeId, viewUrl });
    window.open(viewUrl, "_blank", "noopener,noreferrer");

    fetch(viewUrl, { credentials: "same-origin" }).then((res) => {
      if (res.status === 404) alert("ไม่พบไฟล์เอกสารนี้");
    }).catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={openDocument}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}
