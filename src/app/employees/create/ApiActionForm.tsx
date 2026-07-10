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

      alert(successMessage);
      router.push(redirectTo);
      router.refresh();
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
      </fieldset>
    </form>
  );
}
