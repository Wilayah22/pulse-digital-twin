"use client";

import { ChevronDown, Droplets, Globe2, Leaf, Users, Wallet, Zap } from "lucide-react";
import { useState } from "react";
import { DEFAULT_IMPACT, estimateImpact, type ImpactAssumptions } from "../engine";
import { useLang } from "../i18n/LanguageProvider";
import { useSimulation } from "../state/SimulationProvider";
import { AnimatedNumber, Card, InfoTip, Skeleton, fmt } from "./ui";

interface Field {
  key: keyof ImpactAssumptions;
  label: [string, string];
  unit: [string, string];
  step: number;
  tip: [string, string];
}

// [Arabic, English] pairs.
const FIELDS: Field[] = [
  {
    key: "basins",
    label: ["عدد الأحواض المطبِّقة", "Basins using Pulse"],
    unit: ["حوض", "basins"],
    step: 1000,
    tip: ["عدد أحواض النخيل التي يُفترض أن تعمل بنظام Pulse.", "Number of palm basins assumed to run Pulse."],
  },
  {
    key: "weeksPerYear",
    label: ["أسابيع الري المشابهة سنوياً", "Similar irrigation weeks per year"],
    unit: ["أسبوع", "weeks"],
    step: 1,
    tip: [
      "عدد أسابيع السنة التي تشبه ظروفها الأسبوع المحاكى. القيمة الافتراضية تقديرية.",
      "Weeks per year whose conditions resemble the simulated week. The default is an estimate.",
    ],
  },
  {
    key: "pumpingKwhPerM3",
    label: ["طاقة الضخ لكل م³", "Pumping energy per m³"],
    unit: ["kWh", "kWh"],
    step: 0.05,
    tip: [
      "طاقة ضخ المياه الجوفية لكل متر مكعب. القيمة الافتراضية 0.8 kWh عند عمق رفع 150 م حسب ورقة المشروع، وتختلف حسب عمق البئر ونوع المضخة.",
      "Groundwater pumping energy per m³. The default, 0.8 kWh at a 150 m lift, comes from the project paper and varies with well depth and pump type.",
    ],
  },
  {
    key: "tariffSarPerKwh",
    label: ["تعرفة الكهرباء", "Electricity tariff"],
    unit: ["ر.س/kWh", "SAR/kWh"],
    step: 0.01,
    tip: ["تعرفة الكهرباء المفترضة للاستخدام الزراعي.", "Assumed electricity tariff for agricultural use."],
  },
  {
    key: "litresPerPersonDay",
    label: ["استهلاك الفرد اليومي", "Daily use per person"],
    unit: ["لتر", "litres"],
    step: 5,
    tip: ["متوسط الاستهلاك المنزلي للفرد، يُستخدم لتحويل التوفير إلى عدد أشخاص.", "Average household use per person, used to express the saving as people supplied."],
  },
  {
    key: "co2KgPerKwh",
    label: ["معامل انبعاث الشبكة", "Grid emission factor"],
    unit: ["كغ CO₂/kWh", "kg CO₂/kWh"],
    step: 0.01,
    tip: ["كمية ثاني أكسيد الكربون لكل كيلوواط ساعة من شبكة الكهرباء.", "CO₂ emitted per kWh of grid electricity."],
  },
];

function compact(n: number, en: boolean): { value: number; suffix: string; digits: number } {
  if (n >= 1e6) return { value: n / 1e6, suffix: en ? " million" : " مليون", digits: 2 };
  if (n >= 1e3) return { value: n / 1e3, suffix: en ? "k" : " ألف", digits: 1 };
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
  const { lang } = useLang();
  const c = compact(value, lang === "en");
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
  const { result, impact: a, setImpact: setA } = useSimulation();
  const [open, setOpen] = useState(false);
  const { t, lang } = useLang();
  const pick = (pair: [string, string]) => (lang === "en" ? pair[1] : pair[0]);

  return (
    <Card id="impact" className="overflow-hidden pb-5">
      <div className="bg-gradient-to-l from-pn-navy to-pn-deep rtl:bg-gradient-to-l ltr:bg-gradient-to-r px-5 py-5 text-white">
        <div className="flex items-center gap-2 text-pn-gold">
          <Globe2 size={18} />
          <span className="text-xs font-semibold tracking-wide">{t("أثر Pulse على مستوى الواحة", "Pulse impact at oasis scale")}</span>
        </div>
        <h2 className="mt-1 text-lg font-bold sm:text-xl">{t("لو طُبّق Pulse على أحواض الأحساء…", "If Pulse ran across Al-Ahsa's basins…")}</h2>
        <p className="mt-1 text-xs leading-5 text-white/70">
          {t(
            "تقدير سنوي مبني على نتيجة الأسبوع المحاكى في السيناريو الحالي، مضروباً في افتراضات قابلة للتعديل أدناه. هذه تقديرات للعرض وليست قياسات ميدانية.",
            "An annual estimate scaled from the simulated week in the current scenario, using the editable assumptions below. These are illustrative estimates, not field measurements.",
          )}
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
                {t("في هذا السيناريو وفّر Pulse", "In this scenario Pulse saved")}{" "}
                <span className="num font-bold text-pn-forest">{fmt(est.savedPerBasinWeek)}</span> {t("م³ لكل حوض خلال الأسبوع", "m³ per basin over the week")}
                {est.stressDaysAvoidedPerBasin > 0 && (
                  <>
                    {t(" وقلّل أيام الإجهاد المائي بمعدل", " and cut water-stress days by")}{" "}
                    <span className="num font-bold text-pn-forest">{fmt(est.stressDaysAvoidedPerBasin, 2)}</span> {t("يوم لكل حوض", "days per basin")}
                  </>
                )}
                .
              </p>
              {noSaving ? (
                <div className="rounded-xl bg-[#FAF0DA] px-4 py-3 text-xs leading-5 text-[#8a5a12]">
                  {t(
                    "لا يوجد توفير في المياه في هذا السيناريو (المياه المتاحة كلها مطلوبة)، فلا يُعرض تقدير مائي سنوي. فائدة Pulse هنا في توزيع المياه الشحيحة على الأحواض الأكثر حاجة وتقليل الإجهاد.",
                    "No water is saved in this scenario (all available water is needed), so no annual water estimate is shown. Here Pulse's value is in steering scarce water to the neediest basins and reducing stress.",
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <BigStat icon={<Droplets size={20} />} color="#2699C7" soft="#E3F3FA" label={t("مياه موفّرة سنوياً", "Water saved per year")} value={est.annualWaterM3} unit={t("م³", "m³")} />
                  <BigStat icon={<Users size={20} />} color="#176B50" soft="#E6F4EC" label={t("تكفي الاستهلاك المنزلي لـ", "Covers household use of")} value={est.peopleEquivalent} unit={t("شخص / سنة", "people / yr")} />
                  <BigStat icon={<Wallet size={20} />} color="#B7862F" soft="#FAF0DA" label={t("توفير تكلفة الضخ", "Pumping cost saved")} value={est.costSar} unit={t("ر.س / سنة", "SAR / yr")} />
                  <BigStat icon={<Zap size={20} />} color="#153B4A" soft="#EEF0F4" label={t("طاقة ضخ أقل", "Pumping energy avoided")} value={est.energyKwh} unit={t("kWh / سنة", "kWh / yr")} />
                </div>
              )}

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-xl border border-pn-line bg-pn-bg/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-pn-navy">
                    <Leaf size={16} className="text-pn-green" /> {t("الارتباط بالمستهدفات الوطنية", "Alignment with national goals")}
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-pn-ink/85">
                    <li>
                      •{" "}
                      {t(
                        "يدعم مستهدفات رؤية المملكة 2030 والاستراتيجية الوطنية للمياه في رفع كفاءة استخدام المياه في الزراعة.",
                        "Supports Saudi Vision 2030 and the National Water Strategy goals for agricultural water-use efficiency.",
                      )}
                    </li>
                    <li>• {t("يقلل السحب من المياه الجوفية غير المتجددة في الواحات الزراعية.", "Reduces withdrawals of non-renewable groundwater in farming oases.")}</li>
                    <li>
                      • {t("يخفض انبعاثات الضخ بنحو", "Cuts pumping emissions by about")}{" "}
                      <span className="num font-bold">{fmt(noSaving ? 0 : est.co2Tonnes, 0)}</span>{" "}
                      {t("طن CO₂ سنوياً وفق الافتراضات الحالية.", "t CO₂ per year under the current assumptions.")}
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
                    {t("الافتراضات المستخدمة", "Assumptions used")}
                    <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {!open ? (
                    <p className="mt-2 text-xs leading-5 text-pn-muted">
                      <span className="num">{fmt(a.basins, 0)}</span> {t("حوض", "basins")} · <span className="num">{a.weeksPerYear}</span>{" "}
                      {t("أسبوع/سنة", "weeks/yr")} · <span className="num">{a.pumpingKwhPerM3}</span> {t("kWh/م³", "kWh/m³")} ·{" "}
                      <span className="num">{a.tariffSarPerKwh}</span> {t("ر.س/kWh", "SAR/kWh")}
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {FIELDS.map((fld) => (
                        <label key={fld.key} className="block text-[11px] text-pn-muted">
                          <span className="flex items-center gap-1">
                            {pick(fld.label)}
                            <InfoTip text={pick(fld.tip)} side="top" />
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
                            <span className="shrink-0">{pick(fld.unit)}</span>
                          </span>
                        </label>
                      ))}
                      <button
                        type="button"
                        onClick={() => setA(() => DEFAULT_IMPACT)}
                        className="col-span-full mt-1 justify-self-start text-[11px] font-semibold text-pn-forest hover:underline"
                      >
                        {t("استعادة الافتراضات الأصلية", "Restore default assumptions")}
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
