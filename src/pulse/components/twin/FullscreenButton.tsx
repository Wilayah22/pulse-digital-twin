"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useLang } from "../../i18n/LanguageProvider";

const subscribe = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};

/** Toggles browser full screen for the element with the given id (the twin card), for big-screen demos. */
export function FullscreenButton({ targetId }: { targetId: string }) {
  const isFull = useSyncExternalStore(
    subscribe,
    () => document.fullscreenElement?.id === targetId,
    () => false,
  );
  const supported = useSyncExternalStore(
    () => () => {},
    () => document.fullscreenEnabled,
    () => false,
  );
  const { t } = useLang();
  if (!supported) return null;
  const label = isFull ? t("الخروج من ملء الشاشة", "Exit full screen") : t("ملء الشاشة", "Full screen");
  return (
    <button
      type="button"
      onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.getElementById(targetId)?.requestFullscreen();
      }}
      className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/85 text-pn-navy shadow-sm ring-1 ring-black/5 backdrop-blur hover:bg-white"
      aria-label={label}
      title={label}
    >
      {isFull ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
  );
}
