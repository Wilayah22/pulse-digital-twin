"use client";

import Image from "next/image";
import {
  APPLICATION_EFFICIENCY,
  BASINS,
  CROP,
  SCENARIO_PRESETS,
  SITE,
  SOIL,
  GA_SOIL,
  MAX_PULSE_MM,
  PULSE_REST_MIN,
  SOURCE_FLOW_M3H,
  estimateImpact,
  percentChange,
  readilyAvailableWater,
  totalAvailableWater,
  waterSavingPercent,
  type ImpactAssumptions,
  type SimulationResult,
} from "../../engine";
import { useLang } from "../../i18n/LanguageProvider";
import { AllocationDonut } from "../charts/AllocationDonut";
import { MoistureChart } from "../charts/MoistureChart";
import { SalinityChart } from "../charts/SalinityChart";
import { WaterConsumptionChart } from "../charts/WaterConsumptionChart";
import { fmt, shortDateAr } from "../ui";

const noop = () => {};
const GA_SOIL_KS = BASINS[0].ksMmH;
const hm = (min: number) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, "0")}`;

function Section({ title, children, breakBefore }: { title: string; children: React.ReactNode; breakBefore?: boolean }) {
  return (
    <section className={`mt-6 ${breakBefore ? "break-before-page" : ""}`} style={{ breakInside: "avoid-page" }}>
      <h2 className="mb-2 border-b-2 border-pn-forest pb-1 text-[15px] font-bold text-pn-navy">{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full border-collapse text-[11px]">
      <thead>
        <tr className="bg-pn-navy text-white">
          {head.map((h) => (
            <th key={h} className="border border-pn-navy px-2 py-1.5 text-start font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i % 2 ? "bg-[#F5F5F0]" : "bg-white"}>
            {r.map((c, j) => (
              <td key={j} className="num border border-pn-line px-2 py-1 text-start">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A4 report built only from the simulation result currently on screen. */
export function ReportDocument({
  result,
  activePreset,
  impact,
}: {
  result: SimulationResult;
  activePreset: string | null;
  /** The assumptions currently set in the impact section. */
  impact: ImpactAssumptions;
}) {
  const { t, lang, dir, locale } = useLang();
  const m3 = t("م³", "m³");
  const p = result.pulse;
  const tr = result.traditional;
  const preset = SCENARIO_PRESETS.find((x) => x.id === activePreset);
  const scenarioName = preset ? t(preset.name, preset.nameEn) : t("سيناريو مخصص", "Custom scenario");
  const weatherSource =
    result.weather.source === "open-meteo"
      ? t("بيانات حية من Open-Meteo", "Live Open-Meteo data")
      : result.weather.source === "custom"
        ? t("سيناريو طقس تجريبي مخصص", "Custom test weather scenario")
        : t("بيانات تجريبية (تعذر الاتصال بـ Open-Meteo)", "Demo data (Open-Meteo unreachable)");
  const generated = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(new Date());
  const est = estimateImpact(result, impact);
  const i = result.inputs;
  const dust = { none: t("بدون", "none"), moderate: t("متوسط", "moderate"), severe: t("شديد", "severe") }[i.customWeather.dust];

  const kpis = [
    {
      label: t("إجمالي المياه المستخدمة", "Total water used"),
      value: `${fmt(p.totalUsed)} ${m3}`,
      note: t(`تقليدي: ${fmt(tr.totalUsed)} م³ (${fmt(percentChange(p.totalUsed, tr.totalUsed))}%)`, `Traditional: ${fmt(tr.totalUsed)} m³ (${fmt(percentChange(p.totalUsed, tr.totalUsed))}%)`),
    },
    {
      label: t("نسبة توفير المياه", "Water saving"),
      value: `${fmt(waterSavingPercent(result))}%`,
      note: t(`${fmt(tr.totalUsed - p.totalUsed)} م³ موفّرة`, `${fmt(tr.totalUsed - p.totalUsed)} m³ saved`),
    },
    {
      label: t("متوسط رطوبة التربة", "Average soil moisture"),
      value: `${fmt(p.avgMoisture, 0)}%`,
      note: t(`أيام إجهاد: ${p.stressDays} مقابل ${tr.stressDays}`, `Stress days: ${p.stressDays} vs ${tr.stressDays}`),
    },
    {
      label: t("متوسط ملوحة التربة", "Average soil salinity"),
      value: `${fmt(p.avgEce, 2)} dS/m`,
      note: t(`تقليدي: ${fmt(tr.avgEce, 2)} dS/m`, `Traditional: ${fmt(tr.avgEce, 2)} dS/m`),
    },
  ];

  return (
    <div dir={dir} lang={lang} className="pulse-root bg-white p-0 text-pn-ink" style={{ width: "100%" }}>
      {/* Cover header */}
      <header className="flex items-center justify-between gap-4 border-b-4 border-pn-forest pb-3">
        <div className="flex items-center gap-2">
          <Image src="/pulse/logo-emblem.png" alt="" width={44} height={60} />
          <Image src="/pulse/logo-wordmark.png" alt="Pulse" width={110} height={32} />
        </div>
        <div className="text-end">
          <h1 className="text-xl font-bold text-pn-navy">{t("تقرير محاكاة التوأم الرقمي", "Digital Twin Simulation Report")}</h1>
          <p className="text-[11px] text-pn-muted">
            {t(SITE.nameAr, SITE.nameShortEn)} · {SITE.latitude}°N {SITE.longitude}°E · {generated}
          </p>
        </div>
      </header>

      <div className="mt-4 rounded-lg bg-[#F5F5F0] p-3 text-[12px] leading-6">
        <div>
          <span className="font-bold">{t("السيناريو:", "Scenario:")}</span> {scenarioName}
        </div>
        <div>
          <span className="font-bold">{t("الفترة:", "Period:")}</span> {shortDateAr(result.timeline[0].date, locale)} –{" "}
          {shortDateAr(result.timeline[result.timeline.length - 1].date, locale)} · {t("مصدر الطقس:", "Weather source:")} {weatherSource}
        </div>
        <div className="mt-1 italic text-pn-deep">
          {t(
            "Pulse لا يقرر متى نروي فحسب، بل كيف نوزّع كل قطرة متاحة بذكاء بين الأحواض.",
            "Pulse doesn't just decide when to irrigate. It decides how to share every available drop across the basins.",
          )}
        </div>
      </div>

      <Section title={t("1. ملخص النتائج", "1. Results summary")}>
        <div className="grid grid-cols-4 gap-2">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-lg border border-pn-line p-2.5">
              <div className="text-[10px] text-pn-muted">{k.label}</div>
              <div className="num mt-1 text-lg font-bold text-pn-navy">{k.value}</div>
              <div className="num mt-0.5 text-[10px] text-pn-muted">{k.note}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("2. ظروف المحاكاة", "2. Simulation inputs")}>
        <Table
          head={[t("المعامل", "Parameter"), t("القيمة", "Value")]}
          rows={[
            [t("المياه المتاحة خلال الفترة", "Water available over the period"), `${fmt(i.availableWater, 0)} ${m3}`],
            [t("المياه الواصلة فعلياً", "Water actually delivered"), `${fmt(result.totalDelivered)} ${m3}`],
            [t("ملوحة مياه الري ECw", "Irrigation water salinity ECw"), `${fmt(i.ecw)} dS/m`],
            [t("تأخر المناوبة الأولى", "First water-turn delay"), `${i.delayHours} ${t("ساعة", "h")}`],
            [t("انقطاع الإمداد", "Supply outage"), i.outageFromDay > 0 ? t(`من اليوم ${i.outageFromDay}`, `From day ${i.outageFromDay}`) : t("لا يوجد", "None")],
            [
              t("الطقس", "Weather"),
              i.weatherMode === "custom"
                ? t(
                    `مخصص: ${i.customWeather.temperature}°C · رياح ${i.customWeather.wind} م/ث · أمطار ${i.customWeather.rainfall} مم · غبار ${dust}`,
                    `Custom: ${i.customWeather.temperature}°C · wind ${i.customWeather.wind} m/s · rain ${i.customWeather.rainfall} mm · dust ${dust}`,
                  )
                : weatherSource,
            ],
            [t("معامل المحصول Kc", "Crop coefficient Kc"), fmt(i.kc, 2)],
            [t("متطلب الغسيل LR (FAO-29)", "Leaching requirement LR (FAO-29)"), `${fmt(result.leachingRequirement * 100, 0)}%`],
          ]}
        />
      </Section>

      <Section title={t("3. استهلاك المياه اليومي", "3. Daily water use")}>
        <div dir="ltr" className="w-full">
          <WaterConsumptionChart result={result} selectedDay={-1} onSelectDay={noop} heightClass="h-[260px]" />
        </div>
      </Section>

      <Section title={t("4. توزيع المياه وحالة الأحواض", "4. Allocation and basin status")}>
        <div className="grid grid-cols-[210px_minmax(0,1fr)] items-start gap-5">
          <AllocationDonut result={result} />
          <Table
            head={[
              t("الحوض", "Basin"),
              t("المساحة م²", "Area m²"),
              t("رطوبة البداية", "Start moisture"),
              t("ECe بداية/نهاية", "ECe start/end"),
              t("Pulse م³", "Pulse m³"),
              t("تقليدي م³", "Trad. m³"),
              t("غسيل م³", "Leach m³"),
              t("أيام إجهاد", "Stress days"),
            ]}
            rows={p.basins.map((b) => {
              const tb = tr.basins.find((x) => x.id === b.id)!;
              return [
                b.id,
                fmt(b.area, 0),
                `${fmt(b.initial.moisture, 0)}%`,
                `${fmt(b.initial.ece, 2)} / ${fmt(b.days[b.days.length - 1].eceEnd, 2)}`,
                fmt(b.totalIrrigation),
                fmt(tb.totalIrrigation),
                fmt(b.totalLeaching),
                `${b.stressDays} / ${tb.stressDays}`,
              ];
            })}
          />
        </div>
      </Section>

      <Section title={t("5. التوزيع اليومي وظروف الطقس", "5. Daily allocation and weather")}>
        <Table
          head={[
            t("اليوم", "Day"),
            t("التاريخ", "Date"),
            "ET0 mm",
            t("مطر مم", "Rain mm"),
            t("واصل م³", "Delivered m³"),
            "A",
            "B",
            "C",
            t("Pulse م³", "Pulse m³"),
            t("تقليدي م³", "Trad. m³"),
          ]}
          rows={result.timeline.map((d, k) => [
            d.day,
            shortDateAr(d.date, locale),
            fmt(d.et0),
            fmt(result.weather.days[k].rain),
            fmt(d.delivered),
            ...p.basins.map((b) => fmt(b.days[k].irrigationVolume)),
            fmt(p.dailyUse[k]),
            fmt(tr.dailyUse[k]),
          ])}
        />
      </Section>

      <Section title={t("5.1 جدول نبضات اليوم 1 (Pulse)", "5.1 Day 1 pulse schedule (Pulse)")}>
        {p.schedules[0].length > 0 ? (
          <Table
            head={[
              "#",
              t("الحوض", "Basin"),
              t("النوع", "Type"),
              t("من", "From"),
              t("إلى", "To"),
              t("الحجم م³", "Volume m³"),
            ]}
            rows={p.schedules[0].map((e, k) => [
              k + 1,
              e.basin,
              e.leaching ? t("غسيل أملاح", "Salt leaching") : t(`نبضة ${e.index + 1}`, `Pulse ${e.index + 1}`),
              hm(e.start),
              hm(e.end),
              fmt(e.volumeM3),
            ])}
          />
        ) : (
          <p className="text-[11.5px]">{t("لا ري في اليوم الأول.", "No irrigation on day 1.")}</p>
        )}
        <p className="mt-1.5 text-[10.5px] text-pn-muted">
          {t(
            "الزمن من بداية المناوبة (ساعة:دقيقة). النبضات تتناوب على المصدر المشترك حسب الأولوية، ويُحسب زمن تسرب كل نبضة بمعادلة Green-Ampt.",
            "Time from the start of the water turn (h:mm). Pulses alternate on the shared source by priority; each pulse's soak time follows Green-Ampt.",
          )}
        </p>
      </Section>

      <Section title={t("6. الرطوبة والملوحة", "6. Moisture and salinity")}>
        <div className="grid grid-cols-2 gap-8 pe-6" dir="ltr">
          <MoistureChart result={result} strategy="pulse" selectedDay={-1} onSelectDay={noop} />
          <SalinityChart result={result} strategy="pulse" selectedDay={-1} onSelectDay={noop} />
        </div>
      </Section>

      <Section title={t("7. التوصيات", "7. Recommendations")}>
        <ol className="space-y-2 text-[11.5px] leading-5">
          {result.recommendations.map((r, k) => (
            <li key={r.id} className="rounded-lg border border-pn-line p-2.5" style={{ breakInside: "avoid" }}>
              <div className="font-bold text-pn-navy">
                {k + 1}. {r.action}
              </div>
              <div>
                <span className="font-semibold">{t("السبب: ", "Why: ")}</span>
                {r.reason}
              </div>
              {r.allocation && (
                <div className="text-[#1b6f93]">
                  <span className="font-semibold">{t("المخصص: ", "Allocation: ")}</span>
                  {r.allocation}
                </div>
              )}
              {r.impact && (
                <div className="text-pn-forest">
                  <span className="font-semibold">{t("الأثر المتوقع: ", "Expected impact: ")}</span>
                  {r.impact}
                </div>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section title={t("8. الأثر على مستوى الواحة (تقدير)", "8. Oasis-scale impact (estimate)")}>
        {est.annualWaterM3 > 0 ? (
          <Table
            head={[t("المؤشر", "Indicator"), t("التقدير السنوي", "Annual estimate")]}
            rows={[
              [t("مياه موفّرة", "Water saved"), `${fmt(est.annualWaterM3 / 1e6, 2)} ${t("مليون م³", "million m³")}`],
              [t("تكفي الاستهلاك المنزلي لـ", "Household use covered for"), `${fmt(est.peopleEquivalent, 0)} ${t("شخص", "people")}`],
              [t("طاقة ضخ أقل", "Pumping energy avoided"), `${fmt(est.energyKwh / 1e6, 2)} ${t("مليون kWh", "million kWh")}`],
              [t("توفير تكلفة الضخ", "Pumping cost saved"), `${fmt(est.costSar, 0)} ${t("ر.س", "SAR")}`],
              [t("انبعاثات أقل", "Emissions avoided"), `${fmt(est.co2Tonnes, 0)} ${t("طن CO₂", "t CO₂")}`],
            ]}
          />
        ) : (
          <p className="text-[11.5px]">{t("لا يوجد توفير مائي في هذا السيناريو، فلا يُحسب تقدير سنوي.", "No water saving in this scenario, so no annual estimate is computed.")}</p>
        )}
        <p className="mt-2 text-[10.5px] text-pn-muted">
          {t(
            `الافتراضات: ${fmt(impact.basins, 0)} حوض · ${impact.weeksPerYear} أسبوعاً مشابهاً سنوياً · ${impact.pumpingKwhPerM3} kWh/م³ · ${impact.tariffSarPerKwh} ر.س/kWh · ${impact.litresPerPersonDay} لتر/فرد/يوم · ${impact.co2KgPerKwh} كغ CO₂/kWh. تقديرات للعرض وليست قياسات ميدانية.`,
            `Assumptions: ${fmt(impact.basins, 0)} basins · ${impact.weeksPerYear} similar weeks/yr · ${impact.pumpingKwhPerM3} kWh/m³ · ${impact.tariffSarPerKwh} SAR/kWh · ${impact.litresPerPersonDay} L/person/day · ${impact.co2KgPerKwh} kg CO₂/kWh. Illustrative estimates, not field measurements.`,
          )}
        </p>
      </Section>

      <Section title={t("9. المنهجية والافتراضات", "9. Methodology and assumptions")}>
        <ul className="list-disc space-y-1 ps-5 text-[11px] leading-5">
          <li>
            {t(
              "التبخر-النتح المرجعي ET0 بمعادلة بنمان-مونتيث FAO-56، واحتياج المحصول ETc = Kc × ET0.",
              "Reference evapotranspiration ET0 from FAO-56 Penman-Monteith; crop demand ETc = Kc × ET0.",
            )}
          </li>
          <li>
            {t(
              `موازنة مائية يومية لمنطقة الجذور (FAO-56 المعادلة 85). تربة رملية طميية: TAW = ${fmt(totalAvailableWater(SOIL), 0)} مم، RAW = ${fmt(readilyAvailableWater(SOIL), 0)} مم، عمق جذور ${SOIL.rootDepth} م.`,
              `Daily root-zone water balance (FAO-56 Eq. 85). Sandy-loam soil: TAW = ${fmt(totalAvailableWater(SOIL), 0)} mm, RAW = ${fmt(readilyAvailableWater(SOIL), 0)} mm, root depth ${SOIL.rootDepth} m.`,
            )}
          </li>
          <li>
            {t(
              `ملوحة مياه الري ECw منفصلة عن ملوحة التربة ECe؛ حد تحمّل النخيل ECe = ${CROP.eceThreshold} dS/m (FAO-29). متطلب الغسيل بمعادلة رودز.`,
              `Irrigation water salinity ECw is tracked separately from soil ECe; date-palm tolerance ECe = ${CROP.eceThreshold} dS/m (FAO-29). Leaching requirement via the Rhoades equation.`,
            )}
          </li>
          <li>
            {t(
              `الطبقة الهيدروليكية: يُقسَّم ري كل حوض إلى نبضات لا تتجاوز ${MAX_PULSE_MM} مم، ويُحسب تسرب كل نبضة وعمق جبهة البلل بمعادلة Green-Ampt (Ks = ${fmt(GA_SOIL_KS, 1)} مم/س، ψ = ${GA_SOIL.psiMm} مم، تربة رملية طميية). تتناوب النبضات على مصدر مشترك بتدفق ${SOURCE_FLOW_M3H} م³/س حسب الأولوية، مع راحة ${PULSE_REST_MIN} دقيقة بين نبضات الحوض نفسه.`,
              `Hydraulic layer: each basin's irrigation is split into pulses of at most ${MAX_PULSE_MM} mm; infiltration and wetting-front depth follow Green-Ampt (Ks = ${fmt(GA_SOIL_KS, 1)} mm/h, ψ = ${GA_SOIL.psiMm} mm, sandy loam). Pulses alternate by priority on a shared ${SOURCE_FLOW_M3H} m³/h source, with a ${PULSE_REST_MIN}-minute rest between pulses of the same basin.`,
            )}
            <div dir="ltr" className="my-1.5 flex flex-wrap items-center justify-center gap-x-8 gap-y-1 rounded-md bg-[#F4F1EA] px-3 py-1.5 font-serif text-[12px] italic text-pn-navy">
              <span>f(t) = K<sub>s</sub> (1 + ψ·Δθ / F(t))</span>
              <span>F − ψ·Δθ · ln(1 + F / (ψ·Δθ)) = K<sub>s</sub> · t</span>
              <span>Z(t) = F(t) / Δθ</span>
            </div>
            {t(
              "حيث F(t) كمية الماء المتسربة (مم)، Z(t) عمق جبهة البلل، Δθ = θs − θi فرق الرطوبة الحجمية، ψ شد جبهة البلل.",
              "where F(t) is cumulative infiltration (mm), Z(t) the wetting-front depth, Δθ = θs − θi the volumetric moisture deficit, and ψ the wetting-front suction.",
            )}
          </li>
          <li>
            {t(
              `كفاءة الري ${fmt(APPLICATION_EFFICIENCY * 100, 0)}% لكلا النظامين. الري التقليدي يوزّع المياه الواصلة يومياً بحصص ثابتة حسب المساحة.`,
              `Application efficiency ${fmt(APPLICATION_EFFICIENCY * 100, 0)}% for both systems. Traditional irrigation splits each day's delivery in fixed area shares.`,
            )}
          </li>
          <li>
            {t(
              `البيانات الأولية للأحواض قيم افتراضية للعرض: ${BASINS.map((b) => `${b.id} (${b.area} م²، ECe ${b.initialEce})`).join("، ")}.`,
              `Initial basin data are demonstration defaults: ${BASINS.map((b) => `${b.id} (${b.area} m², ECe ${b.initialEce})`).join(", ")}.`,
            )}
          </li>
        </ul>
      </Section>

      <footer className="mt-6 border-t border-pn-line pt-2 text-[10px] text-pn-muted">
        {t("أُنشئ بواسطة Pulse · التوأم الرقمي لتوزيع مياه الري · جميع الأرقام محسوبة من محرك المحاكاة.", "Generated by Pulse · irrigation allocation digital twin · all figures computed by the simulation engine.")}
      </footer>
    </div>
  );
}
