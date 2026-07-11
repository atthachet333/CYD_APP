"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type DocumentType = "passport" | "visa" | "work_permit" | "ninety_day";

type Props = {
  employeeId?: number | string | null;
  documentType?: DocumentType;
  viewUrl?: string | null;
  className?: string;
  children?: ReactNode;
  missingMessage?: string;
  disabled?: boolean;
  hasFile?: boolean;
};

const DEFAULT_MISSING_MESSAGE = "ยังไม่มีรูปภาพหรือเอกสารให้ดู";

export default function SecureDocumentButton({
  employeeId,
  documentType,
  viewUrl,
  className,
  children = "เปิดดูไฟล์",
  missingMessage = DEFAULT_MISSING_MESSAGE,
  disabled = false,
  hasFile = true,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const resolvedUrl = viewUrl || (employeeId && documentType
    ? `/api/documents/view?employeeId=${encodeURIComponent(String(employeeId))}&documentType=${documentType}`
    : "");

  function closePopup() {
    setPopup(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!popup) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPopup(null);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [popup]);

  async function openDocument() {
    if (loading || disabled) return;
    if (!hasFile || !resolvedUrl) {
      setPopup({ title: "ไม่พบไฟล์", message: missingMessage });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(resolvedUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const errors: Record<number, { title: string; message: string }> = {
          401: { title: "เซสชันหมดอายุ", message: "กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง" },
          403: { title: "ไม่มีสิทธิ์เข้าถึง", message: "คุณไม่มีสิทธิ์ดูรูปภาพหรือเอกสารนี้" },
          404: { title: "ไม่พบไฟล์", message: missingMessage },
        };
        setPopup(errors[response.status] || {
          title: "เปิดไฟล์ไม่สำเร็จ",
          message: "ไม่สามารถเปิดรูปภาพหรือเอกสารได้ กรุณาลองอีกครั้ง",
        });
        return;
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() || "";
      if (contentType.includes("application/json") || contentType.includes("text/html")) {
        setPopup({ title: "เปิดไฟล์ไม่สำเร็จ", message: "ข้อมูลที่ได้รับไม่ใช่รูปภาพหรือเอกสาร" });
        return;
      }

      const blob = await response.blob();
      if (!blob.size) {
        setPopup({ title: "ไม่พบไฟล์", message: missingMessage });
        return;
      }

      const blobUrl = URL.createObjectURL(blob);
      const opened = window.open(blobUrl, "_blank");
      if (!opened) {
        URL.revokeObjectURL(blobUrl);
        setPopup({ title: "เบราว์เซอร์บล็อกหน้าต่าง", message: "กรุณาอนุญาต Popup แล้วลองอีกครั้ง" });
        return;
      }
      try {
        opened.opener = null;
      } catch {}
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      setPopup({ title: "เปิดไฟล์ไม่สำเร็จ", message: "ไม่สามารถเชื่อมต่อเพื่อเปิดไฟล์ได้ กรุณาลองอีกครั้ง" });
    } finally {
      setLoading(false);
    }
  }

  if (!hasFile) {
    return <span className={className || "text-xs font-bold text-gray-400"}>ยังไม่มีไฟล์</span>;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDocument}
        disabled={disabled || loading}
        aria-label={typeof children === "string" ? children : "เปิดดูไฟล์"}
        className={className}
      >
        {loading ? "กำลังเปิด..." : children}
      </button>

      {popup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="secure-file-dialog-title"
            aria-describedby="secure-file-dialog-description"
            className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl"
          >
            <h2 id="secure-file-dialog-title" className="text-lg font-extrabold text-gray-900">{popup.title}</h2>
            <p id="secure-file-dialog-description" className="mt-2 text-sm text-gray-600">{popup.message}</p>
            <button
              ref={closeRef}
              type="button"
              onClick={closePopup}
              className="mt-5 min-w-24 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </>
  );
}
