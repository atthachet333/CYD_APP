"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()} // 🟢 คำสั่งนี้จะพาย้อนกลับไปหน้าที่เพิ่งจากมาเสมอ
      className="min-h-11 rounded-xl px-6 py-3 text-sm font-bold text-gray-500 transition-all hover:bg-gray-100"
    >
      ยกเลิก
    </button>
  );
}
