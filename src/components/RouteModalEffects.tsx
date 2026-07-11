"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RouteModalEffects({ closeHref }: { closeHref: string }) {
  const router = useRouter();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.replace(closeHref);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeHref, router]);

  return null;
}
