"use client";

import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  ChartColumn,
  CloudSun,
  Cpu,
  FileText,
  FlaskConical,
  Gauge,
  Globe2,
  Layers,
  Lightbulb,
  Presentation,
  Radio,
  Scale,
  ThermometerSun,
  Timer,
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
          <span className="h-1.5 w-1.5 rounded-full bg-pn-green" /> {t("التوأم الرقمي لواحة الأحساء", "A digital twin of Al-Ahsa Oasis")}
        </span>
        <h1 className="mt-4 text-3xl leading-tight font-extrabold text-pn-navy sm:text-[42px] sm:leading-[1.2]">
          {t("كل قطرة ماء", "Every drop of water,")}
          <br />
          <span className="text-pn-forest">{t("تذهب حيث تُحتاج", "where it is needed")}</span>
        </h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-pn-ink/80">
          {t(
            "Pulse نظام ذكي لتوزيع مياه الري بين أحواض النخيل التقليدية. لا يقرر متى نروي فحسب، بل كيف نوزّع كل قطرة متاحة بذكاء بين الأحواض.",
            "Pulse is a smart irrigation system for traditional date-palm basins. It doesn't just decide when to irrigate. It decides how to share every available drop across the basins.",
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

function StepChallenge({ t }: { t: T }) {
  return (
    <div>
      <Kicker>{t("التحدي", "The challenge")}</Kicker>
      <h2 className="mt-2 text-2xl font-extrabold text-pn-navy sm:text-4xl">{t("الري بالحصص الثابتة لا يرى الأحواض", "Fixed-share irrigation can't see the basins")}</h2>
      <p className="mt-3 max-w-3xl text-[15px] leading-8 text-pn-ink/75">
        {t(
          "في نظام المناوبة التقليدي تحصل كل الأحواض على نفس الحصة، سواء كانت تربتها جافة أو مشبعة. النتيجة: ماء يتسرب تحت الجذور في حوض، وإجهاد مائي في حوض آخر.",
          "In the traditional rotation every basin gets the same share, whether its soil is dry or saturated. The result: water draining below the roots in one basin and water stress in another.",
        )}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          icon={Scale}
          tone="#D9A441"
          title={t("حصص لا تراعي الحاجة", "Shares ignore need")}
          text={t("توزيع متساوٍ بين حوض جاف وآخر رطب يهدر الماء ويُجهد النخيل.", "Splitting water equally between a dry and a wet basin wastes water and stresses palms.")}
        />
        <Card
          icon={ThermometerSun}
          tone="#DC5B52"
          title={t("حرارة وطلب مرتفع", "Heat and high demand")}
          text={t("التبخر-النتح في الصيف يستنزف التربة بسرعة، والجدول الثابت لا يتكيف.", "Summer evapotranspiration drains soils quickly, and a fixed schedule can't adapt.")}
        />
        <Card
          icon={FlaskConical}
          tone="#153B4A"
          title={t("تراكم الأملاح", "Salt build-up")}
          text={t("مياه الري المالحة ترفع ملوحة التربة إن لم يُدر الغسيل بحساب.", "Saline irrigation water raises soil salinity unless leaching is managed deliberately.")}
        />
        <Card
          icon={Timer}
          tone="#2699C7"
          title={t("تأخر المناوبات وانقطاعها", "Late or missing turns")}
          text={t("حين تتأخر المياه أو تنقطع، لا توجد خطة لتوجيه ما تبقّى.", "When water arrives late or stops, there is no plan for steering what's left.")}
        />
      </div>
    </div>
  );
}

function StepHow({ t, dir }: { t: T; dir: "rtl" | "ltr" }) {
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const steps: { icon: LucideIcon; title: string; text: string }[] = [
    {
      icon: Radio,
      title: t("نقيس", "Measure"),
      text: t("حساسات رطوبة التربة في كل حوض، وتوقعات الطقس من Open-Meteo.", "Soil-moisture sensors in every basin, plus the Open-Meteo weather forecast."),
    },
    {
      icon: Cpu,
      title: t("نحاكي", "Simulate"),
      text: t("توأم رقمي بموازنة مائية يومية وفق FAO-56 يتنبأ بحالة كل حوض.", "A digital twin with an FAO-56 daily water balance forecasts each basin."),
    },
    {
      icon: Gauge,
      title: t("نوزّع", "Allocate"),
      text: t("أولوية حسب جفاف التربة والطلب المائي والملوحة، ضمن مخزون الخزان.", "Priority by soil dryness, crop demand and salinity, within the reservoir stock."),
    },
    {
      icon: Lightbulb,
      title: t("نفسّر", "Explain"),
      text: t("توصية واضحة لكل حوض: ماذا نفعل، ولماذا، وما الأثر المتوقع.", "A clear recommendation per basin: what to do, why, and the expected impact."),
    },
  ];
  return (
    <div>
      <Kicker>{t("كيف يعمل Pulse", "How Pulse works")}</Kicker>
      <h2 className="mt-2 text-2xl font-extrabold text-pn-navy sm:text-4xl">{t("من القياس إلى القرار في أربع خطوات", "From measurement to decision in four steps")}</h2>
      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
        {steps.map((s, i) => (
          <div key={s.title} className="contents">
            <div className="relative rounded-2xl border border-pn-line bg-white p-5 shadow-[0_10px_30px_-18px_rgba(16,42,56,0.25)]">
              <span className="absolute -top-3 start-4 rounded-full bg-pn-navy px-2.5 py-0.5 text-[11px] font-bold text-white">
                <span className="num">{i + 1}</span>
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pn-forest to-pn-green text-white shadow-md">
                <s.icon size={22} />
              </span>
              <h3 className="mt-4 text-lg font-bold text-pn-navy">{s.title}</h3>
              <p className="mt-1 text-[13px] leading-6 text-pn-ink/75">{s.text}</p>
            </div>
            {i < steps.length - 1 && (
              <div className="hidden items-center justify-center text-pn-gold lg:flex" aria-hidden>
                <Arrow size={22} />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-pn-muted">
        {t(
          "المنهجية: FAO-56 (بنمان-مونتيث والموازنة المائية) · FAO-29 (متطلب الغسيل وتحمّل النخيل للملوحة) · بيانات الطقس من Open-Meteo.",
          "Methods: FAO-56 (Penman-Monteith and soil water balance) · FAO-29 (leaching requirement and date-palm salt tolerance) · weather from Open-Meteo.",
        )}
      </p>
    </div>
  );
}

function StepInside({ t }: { t: T }) {
  const items: { icon: LucideIcon; title: string; text: string; tone: string }[] = [
    { icon: Layers, tone: "#176B50", title: t("توأم رقمي حي", "Live digital twin"), text: t("الأحواض والصمامات والخزان تتفاعل مع الطقس والقرارات يوماً بيوم.", "Basins, valves and the reservoir react to weather and decisions day by day.") },
    { icon: CloudSun, tone: "#E6A23C", title: t("7 سيناريوهات جاهزة", "7 ready scenarios"), text: t("موجة حر، أمطار، شح مياه، ملوحة، تأخر، انقطاع… بضغطة واحدة.", "Heatwave, rain, water cuts, salinity, delays, outages, in one click.") },
    { icon: ChartColumn, tone: "#2699C7", title: t("مقارنة مع الري التقليدي", "Comparison with traditional"), text: t("نفس الطقس ونفس المياه، والفرق في الاستهلاك والإجهاد والملوحة.", "Same weather, same water: see the difference in use, stress and salinity.") },
    { icon: BrainCircuit, tone: "#153B4A", title: t("توصيات قابلة للتفسير", "Explainable recommendations"), text: t("كل قرار معه سببه المحسوب وأثره المتوقع، لا توصيات ثابتة.", "Every decision comes with its computed reason and expected impact.") },
    { icon: Globe2, tone: "#38A169", title: t("الأثر على مستوى الواحة", "Oasis-scale impact"), text: t("تقدير سنوي للمياه والطاقة والتكلفة بافتراضات تعدّلها بنفسك.", "Annual water, energy and cost estimates with assumptions you can edit.") },
    { icon: FileText, tone: "#B7862F", title: t("تقرير PDF وعرض تقديمي", "PDF report and presentation"), text: t("تقرير احترافي بضغطة، وجولة عرض بملء الشاشة للمحكّمين.", "A one-click professional report and a full-screen guided tour.") },
  ];
  return (
    <div>
      <Kicker>{t("داخل المحاكي", "Inside the simulator")}</Kicker>
      <h2 className="mt-2 text-2xl font-extrabold text-pn-navy sm:text-4xl">{t("جرّب القرار قبل أن يُتخذ في الحقل", "Test the decision before it reaches the field")}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <Card key={it.title} icon={it.icon} tone={it.tone} title={it.title} text={it.text} />
        ))}
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
  return (
    <div>
      <Kicker>{t("النتائج", "Results")}</Kicker>
      <h2 className="mt-2 text-2xl font-extrabold text-pn-navy sm:text-4xl">{t("Pulse مقابل الري التقليدي", "Pulse vs traditional irrigation")}</h2>
      <p className="mt-3 max-w-3xl text-[15px] leading-8 text-pn-ink/75">
        {t(
          "أرقام محسوبة الآن من محرك المحاكاة نفسه، لأسبوع صيفي نموذجي في الأحساء، تحت نفس الطقس ونفس كمية المياه للنظامين.",
          "Figures computed right now by the same simulation engine, for a typical summer week in Al-Ahsa, under identical weather and water for both systems.",
        )}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="mt-8 flex flex-wrap items-center gap-3">
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

const STEP_COUNT = 5;

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
    t("التحدي", "Challenge"),
    t("كيف يعمل", "How it works"),
    t("داخل المحاكي", "The simulator"),
    t("النتائج", "Results"),
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
          {step === 1 && <StepChallenge t={t} />}
          {step === 2 && <StepHow t={t} dir={dir} />}
          {step === 3 && <StepInside t={t} />}
          {step === 4 && <StepResults t={t} />}
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
