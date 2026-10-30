import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Haze, Sun, type LucideIcon } from "lucide-react";

/** WMO weather interpretation codes (as used by Open-Meteo) → Arabic label and icon. */
export function weatherInfo(code: number): { label: string; labelEn: string; Icon: LucideIcon; color: string } {
  if (code === 0) return { label: "مشمس", labelEn: "Sunny", Icon: Sun, color: "#E6A23C" };
  if (code <= 2) return { label: "غائم جزئياً", labelEn: "Partly cloudy", Icon: CloudSun, color: "#E6A23C" };
  if (code === 3) return { label: "غائم", labelEn: "Cloudy", Icon: Cloud, color: "#718096" };
  if (code >= 4 && code <= 9) return { label: "غبار", labelEn: "Dust", Icon: Haze, color: "#B7894A" };
  if (code === 45 || code === 48) return { label: "ضباب", labelEn: "Fog", Icon: CloudFog, color: "#718096" };
  if (code >= 51 && code <= 57) return { label: "رذاذ", labelEn: "Drizzle", Icon: CloudDrizzle, color: "#2699C7" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: "ممطر", labelEn: "Rain", Icon: CloudRain, color: "#2699C7" };
  if (code >= 95) return { label: "عواصف رعدية", labelEn: "Thunderstorms", Icon: CloudLightning, color: "#153B4A" };
  return { label: "متغير", labelEn: "Variable", Icon: CloudSun, color: "#718096" };
}
