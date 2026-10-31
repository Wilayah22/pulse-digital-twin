"use client";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Cpu,
  FlaskConical,
  Gauge,
  Presentation,
  QrCode,
  Thermometer,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_INPUTS,
  DEMO_WEATHER,
  SCENARIO_PRESETS,
  buildScenarioWeather,
  runSimulation,
  waterSavingPercent,
  type SimulationResult,
} from "../../engine";
import { LanguageProvider, LanguageToggle, useLang } from "../../i18n/LanguageProvider";
import { Splash } from "../Splash";
import { fmt } from "../ui";

const SIMULATOR = "/simulator/";
/** Fixed summer reference week so the figures are reproducible and identical on server and client. */
const REFERENCE_WEEK = "2026-07-15";

function runPreset(id: string): SimulationResult {
  const inputs = SCENARIO_PRESETS.find((p) => p.id === id)!.apply(DEFAULT_INPUTS);
  const weather =
    inputs.weatherMode === "custom"
      ? buildScenarioWeather(inputs.customWeather, REFERENCE_WEEK, "custom")
      : buildScenarioWeather(DEMO_WEATHER, REFERENCE_WEEK, "demo");
  return runSimulation(inputs, weather);
}

type T = (ar: string, en: string) => string;

function Card({ icon: Icon, title, text, tone = "#176B50" }: { icon: LucideIcon; title: string; text: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-pn-line bg-white p-4 shadow-[0_1px_2px_rgba(16,42,56,0.04),0_10px_30px_-18px_rgba(16,42,56,0.25)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${tone}14`, color: tone }}>
        <Icon size={20} />
      </span>
      <h3 className="mt-3 text-[15px] font-bold text-pn-navy">{title}</h3>
      <p className="mt-1 text-[13px] leading-6 text-pn-ink/75">{text}</p>
    </div>
  );
}

function StepWelcome({ t }: { t: T }) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#E6F4EC] px-3 py-1 text-xs font-semibold text-pn-forest">
          <span className="h-1.5 w-1.5 rounded-full bg-pn-green" /> {t("ورقة تعريفية تقنية · 2026", "Technical overview · 2026")}
        </span>
        <h1 className="mt-4 text-3xl leading-tight font-extrabold text-pn-navy sm:text-[42px] sm:leading-[1.2]">
          {t("نظام", "The")} <span className="text-pn-forest">Pulse</span> {t("للري الدقيق", "precision irrigation system")}
          <br />
          {t("في الواحات التقليدية", "for traditional oases")}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-pn-ink/80">
          {t(
            "نظام منخفض التكلفة يحوّل كل عملية ري إلى قياس، ويُجيب عن السؤال الحقيقي في الواحات: أي حوض نسقي أولاً، وبأي ترتيب، ولأي مدة، ضمن حصة مياه مشتركة ومحدودة.",
            "A low-cost system that turns every irrigation into a measurement and answers the real question in oases: which basin first, in what order, and for how long, within a shared and limited water allowance.",
          )}
        </p>
      </div>
      <div className="relative">
        <div className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-[#E6F4EC] to-[#E3F3FA] blur-xl" aria-hidden />
        <Image
          src="/pulse/hero-twin.webp"
          alt={t("التوأم الرقمي: ثلاثة أحواض نخيل وخزان مشترك", "The digital twin: three palm basins and a shared reservoir")}
          width={1600}
          height={748}
          priority
          className="relative h-auto w-full rounded-3xl shadow-[0_30px_60px_-30px_rgba(16,42,56,0.45)] ring-1 ring-black/5"
        />
      </div>
    </div>
  );
}

function StepProblem({ t }: { t: T }) {
  return (
    <div>
      <Kicker>{t("01 · المشكلة الأساسية والواقع الميداني", "01 · The core problem and field reality")}</Kicker>
      <h2 className="mt-2 text-2xl font-extrabold text-pn-navy sm:text-4xl">
        {t("ليس فقط «متى نسقي؟» بل «أي حوض أولاً؟ وبأي ترتيب؟ ولأي مدة؟»", "Not just “when to irrigate?” but “which basin first, in what order, for how long?”")}
      </h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card
          icon={Building2}
          tone="#153B4A"
          title={t("القصور في التقنيات الحالية", "Limits of current technology")}
          text={t(
            "تفترض الشركات الكبرى (مثل CropX وNetafim) وجود أنظمة ضغطية حديثة ومياه متاحة بلا حدود ودون قيود لكل حقل على حدة.",
            "Major vendors (such as CropX and Netafim) assume modern pressurised systems and unconstrained water for each field separately.",
          )}
        />
        <Card
          icon={Waves}
          tone="#2699C7"
          title={t("الواقع في الواحات (مثل الأحساء)", "The reality in oases (e.g. Al-Ahsa)")}
          text={t(
            "تصل المياه عبر قنوات جماعية بنظام المناوبة المائية، حيث يتشارك المزارعون مصدر تدفق محدوداً زمنياً محدداً.",
            "Water arrives through shared channels on a rotation, with farmers sharing a time-limited flow from a single source.",
          )}
        />
        <Card
          icon={Gauge}
          tone="#D9A441"
          title={t("التحدي الحقيقي", "The real challenge")}
          text={t(
            "مشكلة جدولة تحت قيود سعة مشتركة: توزيع حصة محدودة بين عدة أحواض في الوقت المناسب وبالكمية المناسبة.",
            "A scheduling problem under shared-capacity constraints: dividing a limited allowance across several basins at the right time and in the right amount.",
          )}
        />
      </div>
    </div>
  );
}

function Layer({
  icon: Icon,
  tone,
  name,
  sub,
  rows,
}: {
  icon: LucideIcon;
  tone: string;
  name: string;
  sub: string;
  rows: { label: string; text: string }[];
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-pn-line bg-white p-5 shadow-[0_10px_30px_-18px_rgba(16,42,56,0.25)]">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${tone}, ${tone}cc)` }}>
          <Icon size={20} />
        </span>
        <div>
          <h3 className="text-[16px] font-bold text-pn-navy">{name}</h3>
          <div className="latin text-[11px] text-pn-muted">{sub}</div>
        </div>
      </div>
      <dl className="mt-3 space-y-2.5 text-[12.5px] leading-6">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="font-bold" style={{ color: tone }}>
              {r.label}
            </dt>
            <dd className="text-pn-ink/80">{r.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StepLayers({ t }: { t: T }) {
  return (
    <div>
      <Kicker>{t("02 · الهيكلة التقنية", "02 · Technical architecture")}</Kicker>
      <h2 className="mt-2 text-2xl font-extrabold text-pn-navy sm:text-4xl">{t("الطبقات الثلاث", "Three layers")}</h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Layer
          icon={Cpu}
          tone="#2699C7"
          name={t("الطبقة الهيدروليكية", "Hydraulic layer")}
          sub="Hydraulic Layer"
          rows={[
            { label: t("المكونات", "Components"), text: t("وحدة ESP32 + صمام كهربائي (Solenoid Valve) + مستشعر ضغط لكل حوض.", "An ESP32 unit, a solenoid valve and a pressure sensor for each basin.") },
            {
              label: t("آلية العمل (Step Test)", "How it works (Step Test)"),
              text: t(
                "تُعامل كل عملية ري آلياً كـ«اختبار خطوة»؛ يراقب الجهاز هبوط الضغط والتدفق لاستنتاج معدل تسرب المياه في التربة (Ks) وعمق جبهة البلل دون الحاجة إلى خبير تربة.",
                "Every irrigation is treated as a “step test”: the device watches the pressure drop and flow to infer the soil's infiltration rate (Ks) and wetting-front depth, with no soil expert needed.",
              ),
            },
            {
              label: t("الابتكار", "Innovation"),
              text: t(
                "يتم الري على شكل نبضات تتوقف فوراً قبل حدوث التسرب العميق، الذي يهدر المياه ويسحب الأملاح والنترات بعيداً عن الجذور.",
                "Water is applied in pulses that stop before deep percolation, which wastes water and pulls salts and nitrates away from the roots.",
              ),
            },
          ]}
        />
        <Layer
          icon={FlaskConical}
          tone="#B7862F"
          name={t("طبقة الملوحة", "Salt layer")}
          sub={t("«دفتر أستاذ الأملاح» · Salt Layer", "“Salt ledger” · Salt Layer")}
          rows={[
            {
              label: t("آلية العمل", "How it works"),
              text: t(
                "موازنة ثنائية للمياه والأملاح مع معايرة فورية، تتنبأ بملوحة منطقة الجذور قبل 12 شهراً.",
                "A coupled water-and-salt balance with live calibration that forecasts root-zone salinity 12 months ahead.",
              ),
            },
            {
              label: t("الميزة", "Advantage"),
              text: t(
                "بدلاً من نسبة الغسيل الثابتة (10–15%) المستخدمة حالياً، يطبّق النظام غسيلاً ديناميكياً ذكياً، ويلغيه كلياً في مواسم الأمطار لتوفير المياه.",
                "Instead of today's fixed 10–15% leaching fraction, the system applies smart dynamic leaching and skips it entirely in rainy seasons to save water.",
              ),
            },
          ]}
        />
        <Layer
          icon={Thermometer}
          tone="#38A169"
          name={t("طبقة النبات", "Plant layer")}
          sub="Plant Layer"
          rows={[
            { label: t("المكونات", "Components"), text: t("كاميرا حرارية رخيصة أو مشبك لقياس سماكة ورقة النبات.", "A low-cost thermal camera or a clip that measures leaf thickness.") },
            {
              label: t("آلية العمل", "How it works"),
              text: t(
                "قياس فرق حرارة الظلة عن الهواء (T_canopy − T_air) كمؤشر لسلوك الثغور وإجهاد الشجرة.",
                "Measuring the canopy-to-air temperature difference (T_canopy − T_air) as an indicator of stomatal behaviour and tree stress.",
              ),
            },
            {
              label: t("الهدف", "Goal"),
              text: t(
                "توفير «أداة ثقة» مرئية للمزارع تعكس استجابة النخلة الحقيقية، بدلاً من الاكتفاء بنماذج رقمية مجردة.",
                "A visible “trust tool” for the farmer that reflects the palm's real response, rather than relying on abstract models alone.",
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

function StepMath({ t }: { t: T }) {
  const rows = [
    {
      q: t("هل الحوض جاف؟", "Is the basin dry?"),
      a: t("النبات: ترتفع حرارة الأوراق بسبب غلق الثغور نتيجة العطش.", "Plant: leaf temperature rises as stomata close from thirst."),
      b: t("الهيدروليك: سرعة تسرب عالية جداً في النبضة الأولى (Δθ كبيرة).", "Hydraulics: very fast infiltration in the first pulse (large Δθ)."),
    },
    {
      q: t("هل الحوض رطب؟", "Is the basin wet?"),
      a: t("النبات: تبرد الأوراق طبيعياً عبر النتح؛ الشجرة غير مُجهدة.", "Plant: leaves cool normally through transpiration; the tree is not stressed."),
      b: t("الهيدروليك: سرعة تسرب منخفضة جداً بسبب امتلاء الفراغات. يحوّل النظام دورة المياه فوراً إلى حوض أشد حاجة.", "Hydraulics: very slow infiltration as pores are full. The system immediately redirects the water turn to a needier basin."),
    },
    {
      q: t("هل يحتاج غسيل أملاح؟", "Does it need salt leaching?"),
      a: t("الدفتر الرقمي: تتبّع تراكم الأملاح (EC) بالاستعانة بصور الأقمار الصناعية (Sentinel-2).", "Digital ledger: tracks salt build-up (EC) with help from Sentinel-2 satellite imagery."),
      b: t("تنفيذ نبضة غسيل مخصصة فقط عند الحاجة القصوى.", "A dedicated leaching pulse only when truly needed."),
    },
  ];
  return (
    <div>
      <Kicker>{t("03 · الرياضيات خلف «النبضة» · 04 · حالة كل حوض", "03 · The maths behind the “pulse” · 04 · Each basin's state")}</Kicker>
      <div className="mt-3 grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <h2 className="text-2xl font-extrabold text-pn-navy sm:text-3xl">{t("معادلة Green-Ampt", "The Green-Ampt equation")}</h2>
          <p className="mt-2 text-[14px] leading-7 text-pn-ink/75">
            {t("لحساب معدل التسرب وعمق جبهة البلل Z(t) لحظياً:", "To compute the infiltration rate and the wetting-front depth Z(t) in real time:")}
          </p>
          <div dir="ltr" className="mt-4 rounded-2xl bg-[#F3EEE4] px-6 py-6 text-center font-serif text-pn-navy italic shadow-inner">
            <span className="inline-flex items-center gap-2 text-2xl sm:text-3xl">
              f(t) = K<sub className="text-base">s</sub>
              <span className="text-4xl font-light not-italic">(</span>1 +
              <span className="inline-flex flex-col items-center leading-tight">
                <span>ψ · Δθ</span>
                <span className="w-full border-t-2 border-pn-navy/70" />
                <span>Z(t)</span>
              </span>
              <span className="text-4xl font-light not-italic">)</span>
            </span>
            <div className="mt-3 text-[11px] font-sans text-pn-muted not-italic">
              {t("معدل التسرب كدالة لعمق جبهة البلل", "Infiltration rate as a function of wetting-front depth")}
            </div>
          </div>
          <p className="mt-4 text-[13px] leading-7 text-pn-ink/80">
            <span className="font-bold text-pn-navy">{t("دور ESP32:", "The ESP32's role:")}</span>{" "}
            {t(
              "يراقب سرعة امتصاص التربة للماء في النبضة الأولى، وبناءً عليها يحدد هندسياً وبدقة وقت إيقاف الصمام قبل تسرب المياه إلى الأعماق.",
              "It watches how fast the soil absorbs water in the first pulse and from that determines precisely when to close the valve before water drains to depth.",
            )}
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-pn-navy sm:text-3xl">{t("كيف يحدد النظام حالة كل حوض؟", "How does the system read each basin?")}</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-pn-line bg-white">
            <table className="w-full text-[12.5px] leading-6">
              <thead>
                <tr className="bg-pn-navy text-white">
                  <th className="px-3 py-2 text-start font-semibold">{t("السؤال", "Question")}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t("المؤشر الأول", "First indicator")}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t("المؤشر الثاني", "Second indicator")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.q} className={i % 2 ? "bg-[#FAFAF7]" : ""}>
                    <td className="px-3 py-2.5 align-top font-bold text-pn-navy">{r.q}</td>
                    <td className="px-3 py-2.5 align-top text-pn-ink/80">{r.a}</td>
                    <td className="px-3 py-2.5 align-top text-pn-ink/80">{r.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepValue({ t }: { t: T }) {
  const steps = [
    t("توزيع المياه بين الأحواض بعدالة حسب احتياج كل حوض والكمية المتاحة.", "Share water fairly across basins by each basin's need and the amount available."),
    t("إعادة جدولة الري تلقائياً إذا قلّت المياه أو حدث عطل.", "Reschedule automatically if water runs short or something fails."),
    t("الاستمرار بالري على دفعات قصيرة ومراقبة الملوحة.", "Keep irrigating in short pulses while monitoring salinity."),
    t("قياس النتائج ومقارنتها بالري التقليدي لإثبات فائدة النظام.", "Measure results and compare them with traditional irrigation to prove the benefit."),
  ];
  return (
    <div>
      <Kicker>{t("06 · آلية عمل النظام · 07 · ما يميزنا · 05 · الجانب التجاري", "06 · How it works · 07 · What sets us apart · 05 · Business")}</Kicker>
      <div className="mt-3 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-extrabold text-pn-navy sm:text-3xl">{t("آلية عمل النظام", "How the system works")}</h2>
          <ol className="mt-4 divide-y divide-pn-line overflow-hidden rounded-2xl border border-pn-line bg-white">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-4 px-4 py-3.5">
                <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pn-forest text-base font-extrabold text-white">{i + 1}</span>
                <span className="text-[13.5px] leading-6 text-pn-ink/85">{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#F3EEE4] p-5">
            <div className="text-[12px] text-pn-muted">{t("ليس مجرد نظام يعرف متى يسقي،", "Not just a system that knows when to irrigate,")}</div>
            <div className="mt-1 text-xl leading-9 font-extrabold text-pn-navy">
              {t("بل يدير المياه المحدودة بين عدة أحواض، ويحدد الأولوية والكمية المناسبة لكل حوض.", "but one that manages limited water across several basins, setting the right priority and amount for each.")}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              icon={QrCode}
              tone="#176B50"
              title={t("ملصق بصمة المياه QR", "Water-footprint QR label")}
              text={t(
                "يحمل كل صندوق تمر يخرج من المزرعة شهادة موثّقة لمعدل استهلاك المياه (م³/كغ)، مما يجذب المشترين الدوليين الداعمين للاستدامة، حتى مع كون المياه مجانية محلياً.",
                "Every box of dates leaving the farm carries a verified water-use figure (m³/kg), attracting sustainability-minded international buyers even though water is free locally.",
              )}
            />
            <Card
              icon={Zap}
              tone="#D9A441"
              title={t("عائد الكربون", "Carbon return")}
              text={t(
                "كل متر مكعب لا يُضخ — عند عمق رفع 150 م — يوفر نحو 0.8 كيلوواط/ساعة من الطاقة.",
                "Every cubic metre not pumped, from a 150 m lift, saves about 0.8 kWh of energy.",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepResults({ t }: { t: T }) {
  const stats = useMemo(() => {
    const normal = runPreset("normal");
    const heat = runPreset("heatwave");
    const cut = runPreset("water-cut");
    const outage = runPreset("outage");
    return { normal, heat, cut, outage };
  }, []);
  const tiles = [
    {
      value: `${fmt(waterSavingPercent(stats.normal), 0)}%`,
      label: t("توفير في المياه", "Water saved"),
      sub: t("الوضع الطبيعي", "Normal conditions"),
      color: "#176B50",
    },
    {
      value: `${fmt(waterSavingPercent(stats.heat), 0)}%`,
      label: t("توفير حتى في موجة الحر", "Saved even in a heatwave"),
      sub: t("48°C ورياح وغبار", "48°C, wind and dust"),
      color: "#E6A23C",
    },
    {
      value: <VsValue a={stats.cut.pulse.stressDays} b={stats.cut.traditional.stressDays} vs={t("مقابل", "vs")} />,
      label: t("أيام إجهاد مائي", "Water-stress days"),
      sub: t("مع مياه أقل بـ 40%", "With 40% less water"),
      color: "#2699C7",
    },
    {
      value: <VsValue a={stats.outage.pulse.stressDays} b={stats.outage.traditional.stressDays} vs={t("مقابل", "vs")} />,
      label: t("أيام إجهاد مائي", "Water-stress days"),
      sub: t("عند انقطاع مفاجئ للمياه", "In a sudden water outage"),
      color: "#DC5B52",
    },
  ];
  const proto = [
    { n: 3, label: t("أحواض", "basins") },
    { n: 1, label: t("مصدر مياه مشترك", "shared water source") },
    { n: 2, label: t("نظامان للمقارنة", "systems compared") },
  ];
  return (
    <div>
      <Kicker>{t("08 · النموذج الأولي", "08 · The prototype")}</Kicker>
      <h2 className="mt-2 text-2xl font-extrabold text-pn-navy sm:text-4xl">
        {t("نختبر الفرق بين الري التقليدي ونظام Pulse مباشرةً", "We test the difference between traditional irrigation and Pulse, live")}
      </h2>
      <div className="mt-5 grid max-w-xl grid-cols-3 gap-4">
        {proto.map((p) => (
          <div key={p.label} className="border-t-2 border-pn-forest pt-2">
            <div className="num text-3xl font-extrabold text-pn-forest">{p.n}</div>
            <div className="text-xs text-pn-ink/75">{p.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[13px] leading-7 text-pn-ink/70">
        {t(
          "نتائج المحاكي لأسبوع صيفي نموذجي في الأحساء، محسوبة الآن من محرك المحاكاة تحت نفس الطقس ونفس كمية المياه للنظامين:",
          "Simulator results for a typical summer week in Al-Ahsa, computed now by the simulation engine under identical weather and water for both systems:",
        )}
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((x, i) => (
          <div key={i} className="rounded-2xl border border-pn-line bg-white p-5 shadow-[0_10px_30px_-18px_rgba(16,42,56,0.25)]">
            <div className="text-4xl font-extrabold" style={{ color: x.color }}>
              {typeof x.value === "string" ? <span className="num">{x.value}</span> : x.value}
            </div>
            <div className="mt-2 text-sm font-bold text-pn-navy">{x.label}</div>
            <div className="text-xs text-pn-muted">{x.sub}</div>
          </div>
        ))}
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link
          href={SIMULATOR}
          className="inline-flex items-center gap-2 rounded-2xl bg-pn-forest px-6 py-3.5 text-base font-bold text-white shadow-[0_14px_30px_-12px_rgba(23,107,80,0.7)] transition hover:-translate-y-0.5 hover:bg-[#125a43]"
        >
          {t("ابدأ المحاكاة", "Start the simulation")}
        </Link>
        <span className="flex items-center gap-1.5 text-xs text-pn-muted">
          <Presentation size={14} /> {t("داخل المحاكي: زر «ابدأ العرض» لجولة تقديمية بملء الشاشة", "In the simulator, “Start presentation” runs a full-screen guided tour")}
        </span>
      </div>
    </div>
  );
}

/** "Pulse vs traditional" pair; each number is isolated so the phrase reads correctly in both directions. */
function VsValue({ a, b, vs }: { a: number; b: number; vs: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="num">{a}</span>
      <span className="text-base font-bold text-pn-muted">{vs}</span>
      <span className="num text-pn-muted/80">{b}</span>
    </span>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-bold tracking-wider text-pn-gold uppercase">{children}</span>;
}

const STEP_COUNT = 6;

function OnboardingInner() {
  const { t, dir, lang } = useLang();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const last = step === STEP_COUNT - 1;

  const next = useCallback(() => (last ? router.push(SIMULATOR) : setStep((s) => s + 1)), [last, router]);
  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
      const backward = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
      if (e.key === forward || e.key === "Enter") next();
      if (e.key === backward) back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dir, next, back]);

  const titles = [
    t("مرحباً", "Welcome"),
    t("المشكلة", "Problem"),
    t("الطبقات الثلاث", "Three layers"),
    t("النبضة", "The pulse"),
    t("القيمة", "Value"),
    t("النموذج الأولي", "Prototype"),
  ];
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;
  const NextIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div
      dir={dir}
      lang={lang}
      className="pulse-root flex min-h-dvh flex-col"
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 80% -10%, #E3F1E8 0%, transparent 60%), radial-gradient(900px 500px at 0% 110%, #E1F0F6 0%, transparent 55%)",
      }}
    >
      <header className="flex items-center justify-between px-5 py-4 sm:px-10">
        <span className="flex items-center gap-2">
          <Image src="/pulse/logo-emblem.png" alt="" width={36} height={50} priority />
          <Image src="/pulse/logo-wordmark.png" alt="Pulse" width={96} height={28} priority />
        </span>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link href={SIMULATOR} className="rounded-full px-4 py-2 text-sm font-semibold text-pn-muted hover:bg-white hover:text-pn-navy">
            {t("تخطي إلى المحاكي", "Skip to simulator")}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center px-5 py-6 sm:px-10">
        <div key={step} className="pulse-slide mx-auto w-full max-w-6xl">
          {step === 0 && <StepWelcome t={t} />}
          {step === 1 && <StepProblem t={t} />}
          {step === 2 && <StepLayers t={t} />}
          {step === 3 && <StepMath t={t} />}
          {step === 4 && <StepValue t={t} />}
          {step === 5 && <StepResults t={t} />}
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-pn-line/70 bg-white/80 px-5 py-4 backdrop-blur sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <nav className="flex items-center gap-2" aria-label={t("خطوات التعريف", "Onboarding steps")}>
            {titles.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className="group flex items-center gap-2"
              >
                <span className={`h-2 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-pn-forest" : i < step ? "w-2 bg-pn-forest/50" : "w-2 bg-pn-line group-hover:bg-pn-muted/40"}`} />
                <span className={`hidden text-xs md:inline ${i === step ? "font-bold text-pn-navy" : "text-pn-muted"}`}>{i === step ? label : ""}</span>
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="flex items-center gap-1.5 rounded-xl border border-pn-line bg-white px-4 py-2.5 text-sm font-semibold text-pn-navy hover:border-pn-navy/30"
              >
                <BackIcon size={16} /> {t("السابق", "Back")}
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1.5 rounded-xl bg-pn-navy px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-pn-deep"
            >
              {last ? t("ادخل المحاكي", "Enter simulator") : t("التالي", "Next")} <NextIcon size={16} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function Onboarding() {
  return (
    <LanguageProvider>
      <Splash />
      <OnboardingInner />
    </LanguageProvider>
  );
}
