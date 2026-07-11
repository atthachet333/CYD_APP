"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ fallbackHref = "/company-dashboard" }: { fallbackHref?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className="min-h-11 rounded-xl px-6 py-3 text-sm font-bold text-gray-500 transition-all hover:bg-gray-100"
    >
      ยกเลิก
    </button>
  );
}
