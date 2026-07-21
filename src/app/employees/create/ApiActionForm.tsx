"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApiActionForm({
  endpoint,
  children,
  className,
  redirectTo = "/employees/create",
  successMessage = "ดำเนินการสำเร็จ",
}: {
  endpoint: string;
  children: ReactNode;
  className?: string;
  redirectTo?: string;
  successMessage?: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsSubmitting(true);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
      const text = await res.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch (error) {
        console.error("[API_ACTION_FORM] parse error:", error);
      }

      if (!res.ok || data?.ok === false) {
        alert(data?.error || text || "เกิดข้อผิดพลาด");
        return;
      }

      // แสดงแจ้งเตือนเมื่อสำเร็จ
      alert(successMessage);
      
      // 🟢 1. ล้างข้อมูลทุกช่อง รวมถึงไฟล์แนบให้หายไปทันที
      form.reset();
      
      // 🟢 2. บังคับโหลดหน้าใหม่เพื่อเคลียร์แคชทั้งหมด ป้องกันข้อมูลค้าง
      window.location.href = redirectTo;

    } catch (error: any) {
      console.error("[API_ACTION_FORM] fetch error:", error);
      alert(error?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // เพิ่ม encType เพื่อให้ฟอร์มรองรับการอัปโหลดไฟล์ได้อย่างถูกต้อง
    <form className={className} onSubmit={handleSubmit} encType="multipart/form-data">
      <fieldset disabled={isSubmitting} className="contents">
        {children}
        
        {/* เพิ่ม Loading หมุนๆ ให้ดูรู้ว่ากำลังโหลด (คุณสามารถลบส่วนนี้ได้ถ้าไม่ต้องการ) */}
        {isSubmitting && (
          <div className="fixed inset-0 z-[200] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-5 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-gray-700">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              กำลังบันทึกข้อมูล...
            </div>
          </div>
        )}
      </fieldset>
    </form>
  );
}