"use client";

import { CalendarClock, Droplets, FlaskConical, Gauge, Sprout, TrendingUp, X } from "lucide-react";
import { CROP } from "../../engine";
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
  return (
    <div
      dir="rtl"
      className="pulse-pop absolute top-3 left-3 z-20 max-h-[calc(100%-24px)] w-[min(300px,calc(100%-24px))] overflow-y-auto rounded-2xl bg-white/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur"
      role="dialog"
      aria-label={`تفاصيل ${v.name}`}
    >
      <div className="flex items-center gap-3">
        <BasinAvatar id={v.id} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-pn-navy">{v.name}</div>
          <div className="text-[11px] text-pn-muted">
            اليوم {v.day} · المساحة <span className="num">{fmt(v.area, 0)}</span> م²
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 text-pn-muted hover:bg-pn-bg hover:text-pn-navy" aria-label="إغلاق">
          <X size={16} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip color={health.color} soft={health.soft}>{health.label}</Chip>
        <Chip color={prio.color} soft={prio.soft}>أولوية {prio.label}</Chip>
      </div>
      <div className="mt-2 divide-y divide-pn-line">
        <Row icon={<Droplets size={14} />} label="رطوبة التربة" tip="نسبة الماء المتاح في منطقة الجذور (100% = السعة الحقلية، 0% = نقطة الذبول).">
          <span className="num">{fmt(v.moistureBefore, 0)}%</span>
          {v.irrigation > 1e-6 && (
            <span className="text-pn-forest">
              {" "}← <span className="num">{fmt(v.moistureAfter, 0)}%</span>
            </span>
          )}
        </Row>
        <Row
          icon={<FlaskConical size={14} />}
          label="ملوحة التربة ECe"
          tip={`ملوحة مستخلص عجينة التربة المشبعة. حد تحمّل النخيل ${CROP.eceThreshold} dS/m؛ وهي مختلفة عن ملوحة مياه الري ECw.`}
        >
          <span className="num" style={{ color: v.eceEnd > CROP.eceThreshold ? "#DC5B52" : undefined }}>
            {fmt(v.eceEnd, 2)}
          </span>{" "}
          <span className="text-[11px] font-normal text-pn-muted">dS/m</span>
        </Row>
        <Row icon={<Sprout size={14} />} label="الاحتياج المائي" tip="ETc = Kc × ET0، محوّلاً إلى حجم إجمالي بعد كفاءة الري.">
          <span className="num">{fmt(v.etc)}</span> <span className="text-[11px] font-normal text-pn-muted">مم/يوم</span> ·{" "}
          <span className="num">{fmt(v.etcVolume)}</span> <span className="text-[11px] font-normal text-pn-muted">م³</span>
        </Row>
        <Row icon={<Gauge size={14} />} label="أولوية الري" tip="مؤشر يجمع الاستنزاف (65%) والطلب المائي (15%) والملوحة (20%).">
          <span className="num">{fmt(v.priorityScore * 100, 0)}</span>
          <span className="text-[11px] font-normal text-pn-muted">/100</span>
        </Row>
        <Row icon={<CalendarClock size={14} />} label="آخر ري">
          {v.lastIrrigation}
        </Row>
        <Row icon={<TrendingUp size={14} />} label="الطلب المتوقع" tip="مجموع الاحتياج المائي المتوقع من هذا اليوم حتى نهاية الفترة، وفق توقعات ET0.">
          <span className="num">{fmt(v.predictedDemand)}</span> <span className="text-[11px] font-normal text-pn-muted">م³</span>
        </Row>
      </div>
      <div className="mt-2 rounded-xl bg-pn-bg px-3 py-2 text-xs text-pn-deep">
        {v.irrigation > 1e-6 ? (
          <>
            خُصص <span className="num font-bold">{fmt(v.irrigation)}</span> م³ اليوم
            {v.leaching > 1e-6 && (
              <>
                {" "}منها <span className="num font-bold">{fmt(v.leaching)}</span> م³ لغسيل الأملاح
              </>
            )}
            {v.request > v.irrigation + 1e-6 && (
              <>
                {" "}من أصل <span className="num">{fmt(v.request)}</span> م³ مطلوبة
              </>
            )}
            .
          </>
        ) : (
          "لا ري اليوم — الرطوبة المتبقية كافية."
        )}
      </div>
    </div>
  );
}
