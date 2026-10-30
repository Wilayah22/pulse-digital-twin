"use client";

import { ChartColumn, ChartLine, ChartPie, FlaskConical } from "lucide-react";
import { SimulationProvider, useSimulation } from "../state/SimulationProvider";
import { AllocationDonut } from "./charts/AllocationDonut";
import { MoistureChart } from "./charts/MoistureChart";
import { SalinityChart } from "./charts/SalinityChart";
import { WaterConsumptionChart } from "./charts/WaterConsumptionChart";
import { BasinStatusPanel } from "./BasinStatusPanel";
import { ControlPanel } from "./ControlPanel";
import { Header } from "./Header";
import { KpiCards } from "./KpiCards";
import { DecisionFactors, RecommendationPanel } from "./RecommendationPanel";
import { ScenarioPresets } from "./ScenarioPresets";
import { Sidebar } from "./Sidebar";
import { DigitalTwinScene } from "./twin/DigitalTwinScene";
import { Card, CardHeader, Skeleton } from "./ui";
import { WeatherForecast } from "./WeatherForecast";
import { ImpactPanel } from "./ImpactPanel";
import { TourProvider } from "./PresentationTour";
import { Splash } from "./Splash";

function Charts() {
  const { result, selectedDay, setSelectedDay, strategy } = useSimulation();
  const strategyLabel = strategy === "pulse" ? "Pulse" : "الري التقليدي";
  const body = (node: React.ReactNode) => (result ? node : <Skeleton className="h-[260px]" />);
  return (
    <div id="compare" className="grid scroll-mt-28 grid-cols-1 gap-5 xl:grid-cols-3">
      <Card className="pb-3 xl:col-span-2">
        <CardHeader title="مقارنة استهلاك المياه خلال 7 أيام" icon={<ChartColumn size={18} />} subtitle="اضغط على أي يوم لعرضه في التوأم الرقمي" />
        <div className="px-3 pt-2">{body(result && <WaterConsumptionChart result={result} selectedDay={selectedDay} onSelectDay={setSelectedDay} />)}</div>
      </Card>
      <Card className="pb-4">
        <CardHeader title="توزيع المياه بين الأحواض" icon={<ChartPie size={18} />} subtitle="حصص Pulse من إجمالي المياه المتاحة" />
        <div className="px-4 pt-3">{body(result && <AllocationDonut result={result} />)}</div>
      </Card>
      <Card className="pb-3 xl:col-span-1">
        <CardHeader title="الرطوبة قبل وبعد الري" icon={<ChartLine size={18} />} subtitle={`% من الماء المتاح · ${strategyLabel}`} />
        <div className="px-3 pt-2">
          {body(result && <MoistureChart result={result} strategy={strategy} selectedDay={selectedDay} onSelectDay={setSelectedDay} />)}
        </div>
      </Card>
      <Card className="pb-3 xl:col-span-2">
        <CardHeader title="تطور ملوحة التربة" icon={<FlaskConical size={18} />} subtitle={`ECe المتوقعة (dS/m) · ${strategyLabel}`} />
        <div className="px-3 pt-2">
          {body(result && <SalinityChart result={result} strategy={strategy} selectedDay={selectedDay} onSelectDay={setSelectedDay} />)}
        </div>
      </Card>
    </div>
  );
}

export function Dashboard() {
  return (
    <SimulationProvider>
      <TourProvider>
      <Splash />
      <div dir="rtl" lang="ar" className="pulse-root min-h-dvh">
        <Header />
        <div className="flex">
          <Sidebar />
          <main id="overview" className="min-w-0 flex-1 scroll-mt-28 p-4 lg:p-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
              {/* In RTL the first column sits on the right: controls and basin status. */}
              <div className="order-2 space-y-5 lg:order-1">
                <ControlPanel />
                <BasinStatusPanel />
                <DecisionFactors />
              </div>
              <div className="order-1 min-w-0 space-y-5 lg:order-2">
                <Card id="twin" className="p-3 sm:p-4">
                  <DigitalTwinScene />
                </Card>
                <ScenarioPresets />
                <KpiCards />
                <Charts />
                <ImpactPanel />
                <div className="grid grid-cols-1 gap-5">
                  <WeatherForecast />
                  <RecommendationPanel />
                </div>
              </div>
            </div>
            <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-pn-line pt-4 text-[11px] text-pn-muted">
              <span>
                Pulse — التوأم الرقمي لتوزيع مياه الري · المنهجية: FAO-56 (بنمان-مونتيث، الموازنة المائية)، FAO-29 (متطلب الغسيل)
              </span>
              <span>جميع الأرقام محسوبة من محرك المحاكاة أو من Open-Meteo</span>
            </footer>
          </main>
        </div>
      </div>
      </TourProvider>
    </SimulationProvider>
  );
}
