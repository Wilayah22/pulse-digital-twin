import type { Metadata } from "next";
import { Dashboard } from "@/pulse/components/Dashboard";

export const metadata: Metadata = {
  title: "Pulse · المحاكي",
};

export default function SimulatorPage() {
  return <Dashboard />;
}
