import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { BridgeProvider } from "@/components/bridge-provider";
import { ReferralCapture } from "@/components/referral-capture";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const appName = "PulseTrade";

export const metadata: Metadata = {
  title: appName,
  description: `${appName} — торговый терминал бинарных опционов в Telegram`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={cn("dark font-sans", geist.variable)}>
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-[#050807] antialiased">
        <BridgeProvider />
        <ReferralCapture />
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#050807]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.16em]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
                <Activity className="h-4 w-4" />
              </div>
              {appName}
            </Link>
            <AppNav />
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 bg-[#050807]">
          <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>{appName}</span>
            <span>Терминал USDT</span>
          </div>
        </footer>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
