"use client";

import { useEffect, useRef } from "react";

import { parseReferralCode } from "@/lib/referrals";

type TelegramWebApp = {
  initDataUnsafe?: {
    start_param?: string;
  };
};

function readStartParam(): string | null {
  const url = new URL(window.location.href);

  for (const key of ["startapp", "start_param", "tgWebAppStartParam"]) {
    const value = url.searchParams.get(key);

    if (value) {
      return value;
    }
  }

  const telegram = (
    window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }
  ).Telegram?.WebApp;
  const startParam = telegram?.initDataUnsafe?.start_param;

  return typeof startParam === "string" && startParam ? startParam : null;
}

export function ReferralCapture() {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) {
      return;
    }

    const code = readStartParam();

    if (!code || parseReferralCode(code) === null) {
      return;
    }

    sentRef.current = true;
    const key = `vibecraft:referral:${code}`;

    try {
      if (sessionStorage.getItem(key)) {
        return;
      }
    } catch {
      void 0;
    }

    void fetch("/api/referrals/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((response) => {
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          try {
            sessionStorage.setItem(key, "1");
          } catch {
            void 0;
          }
        }
      })
      .catch(() => undefined);
  }, []);

  return null;
}
