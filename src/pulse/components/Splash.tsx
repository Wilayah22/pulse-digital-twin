"use client";

import Image from "next/image";
import { useState } from "react";

/** Brief brand intro on load. Fades out on its own; a click skips it. */
export function Splash() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div
      dir="rtl"
      onClick={() => setHidden(true)}
      onAnimationEnd={(e) => e.target === e.currentTarget && setHidden(true)}
      className="pulse-splash fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center bg-white"
      role="presentation"
    >
      <div className="pulse-rise flex items-center gap-3">
        <Image src="/pulse/logo-emblem.png" alt="" width={84} height={115} priority />
        <Image src="/pulse/logo-wordmark.png" alt="Pulse" width={176} height={51} priority />
      </div>
      <p className="pulse-rise mt-6 max-w-md px-6 text-center text-base leading-8 text-pn-navy sm:text-lg" style={{ animationDelay: "0.25s" }}>
        Pulse لا يقرر <span className="font-bold text-pn-forest">متى</span> نروي فحسب، بل <span className="font-bold text-pn-forest">كيف</span> نوزّع كل
        قطرة متاحة بذكاء بين الأحواض.
      </p>
      <p className="pulse-rise mt-3 text-xs text-pn-muted" style={{ animationDelay: "0.45s" }}>
        التوأم الرقمي · واحة الأحساء
      </p>
    </div>
  );
}
