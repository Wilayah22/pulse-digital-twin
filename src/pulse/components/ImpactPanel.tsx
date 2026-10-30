"use client";

import { ChevronDown, Droplets, Globe2, Leaf, Users, Wallet, Zap } from "lucide-react";
import { useState } from "react";
import { DEFAULT_IMPACT, estimateImpact, type ImpactAssumptions } from "../engine";
import { useSimulation } from "../state/SimulationProvider";
import { AnimatedNumber, Card, InfoTip, Skeleton, fmt } from "./ui";

const FIELDS: { key: keyof ImpactAssumptions; label: string; unit: string; step: number; tip: string }[] = [
  { key: "basins", label: "عدد الأحواض المطبِّقة", unit: "حوض", step: 1000, tip: "عدد أحواض النخيل التي يُفترض أن تعمل بنظام Pulse." },
  {
    key: "weeksPerYear",
    label: "أسابيع الري المشابهة سنوياً",
    unit: "أسبوع",
    step: 1,
    tip: "عدد أسابيع السنة التي تشبه ظروفها الأسبوع المحاكى. القيمة الافتراضية تقديرية.",
  },
  { key: "pumpingKwhPerM3", label: "طاقة الضخ لكل م³", unit: "kWh", step: 0.05, tip: "طاقة ضخ المياه الجوفية لكل متر مكعب. تختلف حسب عمق البئر ونوع المضخة." },
  { key: "tariffSarPerKwh", label: "تعرفة الكهرباء", unit: "ر.س/kWh", step: 0.01, tip: "تعرفة الكهرباء المفترضة للاستخدام الزراعي." },
  { key: "litresPerPersonDay", label: "استهلاك الفرد اليومي", unit: "لتر", step: 5, tip: "متوسط الاستهلاك المنزلي للفرد، يُستخدم لتحويل التوفير إلى عدد أشخاص." },
  { key: "co2KgPerKwh", label: "معامل انبعاث الشبكة", unit: "كغ CO₂/kWh", step: 0.01, tip: "كمية ثاني أكسيد الكربون لكل كيلوواط ساعة من شبكة الكهرباء." },
];

function compact(n: number): { value: number; suffix: string; digits: number } {
  if (n >= 1e6) return { value: n / 1e6, suffix: " مليون", digits: 2 };
  if (n >= 1e3) return { value: n / 1e3, suffix: " ألف", digits: 1 };
  return { value: n, suffix: "", digits: 0 };
}

function BigStat({
  icon,
  color,
  soft,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  color: string;
  soft: string;
  label: string;
  value: number;
  unit: string;
}) {
  const c = compact(value);
  return (
    <div className="rounded-2xl border border-pn-line bg-white p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: soft, color }}>
        {icon}
      </span>
      <div className="mt-3 text-xs text-pn-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-1 text-pn-navy">
        <AnimatedNumber value={c.value} digits={c.digits} className="text-2xl font-bold" />
        <span className="text-sm font-semibold">{c.suffix}</span>
        <span className="text-xs text-pn-muted">{unit}</span>
      </div>
    </div>
  );
}

export function ImpactPanel() {
  const { result } = useSimulation();
  const [a, setA] = useState<ImpactAssumptions>(DEFAULT_IMPACT);
  const [open, setOpen] = useState(false);

  return (
    <Card id="impact" className="overflow-hidden pb-5">
      <div className="bg-gradient-to-l from-pn-navy to-pn-deep px-5 py-5 text-white">
        <div className="flex items-center gap-2 text-pn-gold">
          <Globe2 size={18} />
          <span className="text-xs font-semibold tracking-wide">أثر Pulse على مستوى الواحة</span>
        </div>
        <h2 className="mt-1 text-lg font-bold sm:text-xl">لو طُبّق Pulse على أحواض الأحساء…</h2>
        <p className="mt-1 text-xs leading-5 text-white/70">
          تقدير سنوي مبني على نتيجة الأسبوع المحاكى في السيناريو الحالي، مضروباً في افتراضات قابلة للتعديل أدناه. هذه تقديرات للعرض وليست
          قياسات ميدانية.
        </p>
      </div>

      {!result ? (
        <div className="grid grid-cols-2 gap-3 p-5 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        (() => {
          const est = estimateImpact(result, a);
          const noSaving = est.savedPerBasinWeek <= 1e-6;
          return (
            <div className="px-5 pt-4">
              <p className="mb-3 text-xs text-pn-muted">
                في هذا السيناريو وفّر Pulse{" "}
                <span className="num font-bold text-pn-forest">{fmt(est.savedPerBasinWeek)}</span> م³ لكل حوض خلال الأسبوع
                {est.stressDaysAvoidedPerBasin > 0 && (
                  <>
                    {" "}وقلّل أيام الإجهاد المائي بمعدل <span className="num font-bold text-pn-forest">{fmt(est.stressDaysAvoidedPerBasin, 2)}</span> يوم لكل
                    حوض
                  </>
                )}
                .
              </p>
              {noSaving ? (
                <div className="rounded-xl bg-[#FAF0DA] px-4 py-3 text-xs leading-5 text-[#8a5a12]">
                  لا يوجد توفير في المياه في هذا السيناريو (المياه المتاحة كلها مطلوبة)، فلا يُعرض تقدير مائي سنوي. فائدة Pulse هنا في توزيع المياه
                  الشحيحة على الأحواض الأكثر حاجة وتقليل الإجهاد.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <BigStat icon={<Droplets size={20} />} color="#2699C7" soft="#E3F3FA" label="مياه موفّرة سنوياً" value={est.annualWaterM3} unit="م³" />
                  <BigStat icon={<Users size={20} />} color="#176B50" soft="#E6F4EC" label="تكفي الاستهلاك المنزلي لـ" value={est.peopleEquivalent} unit="شخص / سنة" />
                  <BigStat icon={<Wallet size={20} />} color="#B7862F" soft="#FAF0DA" label="توفير تكلفة الضخ" value={est.costSar} unit="ر.س / سنة" />
                  <BigStat icon={<Zap size={20} />} color="#153B4A" soft="#EEF0F4" label="طاقة ضخ أقل" value={est.energyKwh} unit="kWh / سنة" />
                </div>
              )}

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-xl border border-pn-line bg-pn-bg/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-pn-navy">
                    <Leaf size={16} className="text-pn-green" /> الارتباط بالمستهدفات الوطنية
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-pn-ink/85">
                    <li>• يدعم مستهدفات رؤية المملكة 2030 والاستراتيجية الوطنية للمياه في رفع كفاءة استخدام المياه في الزراعة.</li>
                    <li>• يقلل السحب من المياه الجوفية غير المتجددة في الواحات الزراعية.</li>
                    <li>
                      • يخفض انبعاثات الضخ بنحو{" "}
                      <span className="num font-bold">{fmt(noSaving ? 0 : est.co2Tonnes, 0)}</span> طن CO₂ سنوياً وفق الافتراضات الحالية.
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-pn-line p-4">
                  <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between text-sm font-bold text-pn-navy"
                  >
                    الافتراضات المستخدمة
                    <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {!open ? (
                    <p className="mt-2 text-xs leading-5 text-pn-muted">
                      <span className="num">{fmt(a.basins, 0)}</span> حوض · <span className="num">{a.weeksPerYear}</span> أسبوع/سنة ·{" "}
                      <span className="num">{a.pumpingKwhPerM3}</span> kWh/م³ · <span className="num">{a.tariffSarPerKwh}</span> ر.س/kWh
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {FIELDS.map((fld) => (
                        <label key={fld.key} className="block text-[11px] text-pn-muted">
                          <span className="flex items-center gap-1">
                            {fld.label}
                            <InfoTip text={fld.tip} side="top" />
                          </span>
                          <span className="mt-1 flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              step={fld.step}
                              value={a[fld.key]}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setA((x) => ({ ...x, [fld.key]: Number.isFinite(v) && v >= 0 ? v : 0 }));
                              }}
                              className="num w-full rounded-lg border border-pn-line bg-white px-2 py-1.5 text-sm font-semibold text-pn-navy"
                            />
                            <span className="shrink-0">{fld.unit}</span>
                          </span>
                        </label>
                      ))}
                      <button
                        type="button"
                        onClick={() => setA(DEFAULT_IMPACT)}
                        className="col-span-full mt-1 justify-self-start text-[11px] font-semibold text-pn-forest hover:underline"
                      >
                        استعادة الافتراضات الأصلية
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      )}
    </Card>
  );
}
