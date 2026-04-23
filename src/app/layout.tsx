import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { SiteHeader } from "@/components/site/SiteHeader";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-geist-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "ТиНАО · Рейтинг учреждений культуры и спорта",
  description:
    "Современный рейтинг учреждений Троицка и Новой Москвы: группы, паспортные данные и расчёт эффективности по методике.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen font-sans">
        <AnimatedBackground />
        <SiteHeader />
        <main>{children}</main>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
