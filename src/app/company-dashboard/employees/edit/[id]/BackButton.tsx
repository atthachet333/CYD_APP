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
      className="px-6 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all mr-3"
    >
      ยกเลิก
    </button>
  );
}
