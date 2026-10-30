import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";
import "./pulse.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: "Pulse · التوأم الرقمي",
  description: "محاكاة التوأم الرقمي لتوزيع مياه الري بذكاء بين أحواض واحة الأحساء.",
  icons: { icon: "/pulse/icon.png", apple: "/pulse/icon.png" },
  // Absolute base so link previews (WhatsApp, LinkedIn, X) can fetch the share image.
  metadataBase: new URL("https://pulse-digital-twin.onrender.com"),
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: "Pulse",
    title: "Pulse · التوأم الرقمي لتوزيع مياه الري",
    description: "Pulse لا يقرر متى نروي فحسب، بل كيف نوزّع كل قطرة متاحة بذكاء بين أحواض واحة الأحساء.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "التوأم الرقمي لـ Pulse: ثلاثة أحواض نخيل وخزان مشترك" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulse · التوأم الرقمي لتوزيع مياه الري",
    description: "توزيع ذكي لكل قطرة مياه بين أحواض واحة الأحساء.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${plex.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
