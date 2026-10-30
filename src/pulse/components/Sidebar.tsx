"use client";

import { ChartColumn, CloudSun, FileText, Globe2, House, LayoutGrid, Sprout, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "../i18n/LanguageProvider";

export const NAV: { id: string; label: string; labelEn: string; Icon: LucideIcon }[] = [
  { id: "overview", label: "الرئيسية", labelEn: "Home", Icon: House },
  { id: "twin", label: "المحاكاة", labelEn: "Simulation", Icon: LayoutGrid },
  { id: "basins", label: "الأحواض", labelEn: "Basins", Icon: Sprout },
  { id: "weather", label: "الطقس", labelEn: "Weather", Icon: CloudSun },
  { id: "compare", label: "المقارنة", labelEn: "Comparison", Icon: ChartColumn },
  { id: "impact", label: "الأثر", labelEn: "Impact", Icon: Globe2 },
  { id: "report", label: "التقارير", labelEn: "Reports", Icon: FileText },
];

/** Tracks which dashboard section is in view so the active nav item follows scrolling. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState("twin");
  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let best: string | null = null;
        let ratio = 0;
        for (const id of ids) {
          const r = visible.get(id) ?? 0;
          if (r > ratio) {
            ratio = r;
            best = id;
          }
        }
        if (best) setActive(best);
      },
      { rootMargin: "-96px 0px -45% 0px", threshold: [0, 0.15, 0.4, 0.75] },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return [active, setActive] as const;
}

const IDS = NAV.map((n) => n.id);

export function Sidebar() {
  const { t, lang } = useLang();
  const [active, setActive] = useActiveSection(IDS);
  const go = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <aside className="sticky top-[80px] hidden h-[calc(100dvh-80px)] w-[76px] shrink-0 flex-col bg-gradient-to-b from-pn-navy to-pn-deep px-3 py-5 md:flex xl:w-60">
      <nav className="flex flex-col gap-1.5" aria-label={t("التنقل الرئيسي", "Main navigation")}>
        {NAV.map(({ id, label: labelAr, labelEn, Icon }) => {
          const label = t(labelAr, labelEn);
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={on ? "true" : undefined}
              title={label}
              className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-300 ${
                on
                  ? "bg-gradient-to-l from-[#b8862f] to-pn-gold font-semibold text-white shadow-[0_6px_18px_-6px_rgba(217,164,65,0.7)]"
                  : "text-white/70 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon size={20} className={`shrink-0 transition-transform duration-300 ${on ? "" : "group-hover:scale-110"}`} />
              <span className="hidden xl:inline">{label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto hidden rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 xl:block">
        <p className="text-[13px] leading-6 text-white/85">
          {lang === "ar" ? (
            <>
              Pulse لا يقرر <span className="text-pn-gold">متى</span> نروي فحسب، بل <span className="text-pn-gold">كيف</span> نوزّع كل قطرة
              متاحة بذكاء بين الأحواض.
            </>
          ) : (
            <>
              Pulse doesn&apos;t just decide <span className="text-pn-gold">when</span> to irrigate. It decides <span className="text-pn-gold">how</span>{" "}
              to share every available drop across the basins.
            </>
          )}
        </p>
        <p className="mt-3 text-xs text-white/50">{t("كل قطرة .. قرار أذكى", "Every drop, a smarter decision")}</p>
      </div>
    </aside>
  );
}
