"use client";

import { CalendarClock, Droplets, FlaskConical, Gauge, Sprout, TrendingUp, X } from "lucide-react";
import { CROP } from "../../engine";
import { useLang } from "../../i18n/LanguageProvider";
import type { BasinDayView } from "../../state/selectors";
import { BasinAvatar, Chip, HEALTH_META, InfoTip, PRIORITY_META, fmt } from "../ui";

function Row({ icon, label, tip, children }: { icon: React.ReactNode; label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-xs text-pn-muted">
        <span className="text-pn-forest">{icon}</span>
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      <span className="text-sm font-semibold text-pn-navy">{children}</span>
    </div>
  );
}

export function BasinDetailPanel({ view: v, onClose }: { view: BasinDayView; onClose: () => void }) {
  const health = HEALTH_META[v.health];
  const prio = PRIORITY_META[v.priority];
  const { t, dir, arrow } = useLang();
  const m3 = t("م³", "m³");
  return (
    <div
      dir={dir}
      className="pulse-pop absolute top-3 left-3 z-20 max-h-[calc(100%-24px)] w-[min(300px,calc(100%-24px))] overflow-y-auto rounded-2xl bg-white/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur"
      role="dialog"
      aria-label={t(`تفاصيل الحوض ${v.id}`, `Basin ${v.id} details`)}
    >
      <div className="flex items-center gap-3">
        <BasinAvatar id={v.id} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-pn-navy">{t(`الحوض ${v.id}`, `Basin ${v.id}`)}</div>
          <div className="text-[11px] text-pn-muted">
            {t(`اليوم ${v.day} · المساحة`, `Day ${v.day} · Area`)} <span className="num">{fmt(v.area, 0)}</span> {t("م²", "m²")}
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 text-pn-muted hover:bg-pn-bg hover:text-pn-navy" aria-label={t("إغلاق", "Close")}>
          <X size={16} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip color={health.color} soft={health.soft}>{t(health.label, health.labelEn)}</Chip>
        <Chip color={prio.color} soft={prio.soft}>{t(`أولوية ${prio.label}`, `${prio.labelEn} priority`)}</Chip>
      </div>
      <div className="mt-2 divide-y divide-pn-line">
        <Row icon={<Droplets size={14} />} label={t("رطوبة التربة", "Soil moisture")}
          tip={t("نسبة الماء المتاح في منطقة الجذور (100% = السعة الحقلية، 0% = نقطة الذبول).", "Root-zone available water (100% = field capacity, 0% = wilting point).")}>
          <span className="num">{fmt(v.moistureBefore, 0)}%</span>
          {v.irrigation > 1e-6 && (
            <span className="text-pn-forest">
              {" "}{arrow} <span className="num">{fmt(v.moistureAfter, 0)}%</span>
            </span>
          )}
        </Row>
        <Row
          icon={<FlaskConical size={14} />}
          label={t("ملوحة التربة ECe", "Soil salinity ECe")}
          tip={t(
            `ملوحة مستخلص عجينة التربة المشبعة. حد تحمّل النخيل ${CROP.eceThreshold} dS/m؛ وهي مختلفة عن ملوحة مياه الري ECw.`,
            `Saturated-paste extract salinity. Date-palm tolerance is ${CROP.eceThreshold} dS/m; this differs from irrigation-water salinity ECw.`,
          )}
        >
          <span className="num" style={{ color: v.eceEnd > CROP.eceThreshold ? "#DC5B52" : undefined }}>
            {fmt(v.eceEnd, 2)}
          </span>{" "}
          <span className="text-[11px] font-normal text-pn-muted">dS/m</span>
        </Row>
        <Row icon={<Sprout size={14} />} label={t("الاحتياج المائي", "Water requirement")}
          tip={t("ETc = Kc × ET0، محوّلاً إلى حجم إجمالي بعد كفاءة الري.", "ETc = Kc × ET0, converted to a gross volume after irrigation efficiency.")}>
          <span className="num">{fmt(v.etc)}</span> <span className="text-[11px] font-normal text-pn-muted">{t("مم/يوم", "mm/day")}</span> ·{" "}
          <span className="num">{fmt(v.etcVolume)}</span> <span className="text-[11px] font-normal text-pn-muted">{m3}</span>
        </Row>
        <Row icon={<Gauge size={14} />} label={t("أولوية الري", "Irrigation priority")}
          tip={t("مؤشر يجمع الاستنزاف (65%) والطلب المائي (15%) والملوحة (20%).", "Index combining depletion (65%), crop demand (15%) and salinity (20%).")}>
          <span className="num">{fmt(v.priorityScore * 100, 0)}</span>
          <span className="text-[11px] font-normal text-pn-muted">/100</span>
        </Row>
        <Row icon={<CalendarClock size={14} />} label={t("آخر ري", "Last irrigation")}>
          {t(v.lastIrrigation, v.lastIrrigationEn)}
        </Row>
        <Row icon={<TrendingUp size={14} />} label={t("الطلب المتوقع", "Predicted demand")}
          tip={t("مجموع الاحتياج المائي المتوقع من هذا اليوم حتى نهاية الفترة، وفق توقعات ET0.", "Total forecast water need from this day to the end of the period, based on the ET0 forecast.")}>
          <span className="num">{fmt(v.predictedDemand)}</span> <span className="text-[11px] font-normal text-pn-muted">{m3}</span>
        </Row>
      </div>
      <div className="mt-2 rounded-xl bg-pn-bg px-3 py-2 text-xs text-pn-deep">
        {v.irrigation > 1e-6 ? (
          <>
            {t("خُصص", "Allocated")} <span className="num font-bold">{fmt(v.irrigation)}</span> {t("م³ اليوم", "m³ today")}
            {v.leaching > 1e-6 && (
              <>
                {t(" منها", ", of which")} <span className="num font-bold">{fmt(v.leaching)}</span> {t("م³ لغسيل الأملاح", "m³ for salt leaching")}
              </>
            )}
            {v.request > v.irrigation + 1e-6 && (
              <>
                {t(" من أصل", " out of")} <span className="num">{fmt(v.request)}</span> {t("م³ مطلوبة", "m³ requested")}
              </>
            )}
            .
          </>
        ) : (
          t("لا ري اليوم — الرطوبة المتبقية كافية.", "No irrigation today: remaining moisture is sufficient.")
        )}
      </div>
    </div>
  );
}
