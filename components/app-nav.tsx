"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CandlestickChart,
  MessageCircle,
  UserRound,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Терминал", icon: CandlestickChart },
  { href: "/wallet", label: "Баланс", icon: Wallet },
  { href: "/support", label: "Поддержка", icon: MessageCircle },
  { href: "/profile", label: "Профиль", icon: UserRound },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="Основная навигация">
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium transition-colors",
              isActive
                ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/25"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden min-[430px]:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
