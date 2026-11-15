export const TELEGRAM_ID_HEADER = "x-telegram-id";

const telegramAccountPrefix = "telegram:";

type TelegramWebApp = {
  initDataUnsafe?: {
    user?: {
      id?: number;
    };
  };
};

export function parseTelegramId(
  value: string | null | undefined
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const id = Number(trimmed);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function readTelegramId(headers: Headers): number | null {
  return parseTelegramId(headers.get(TELEGRAM_ID_HEADER));
}

export function getTelegramAccountId(telegramId: number): string {
  return `${telegramAccountPrefix}${telegramId}`;
}

export function getTelegramUserId(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const telegram = (
    window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }
  ).Telegram?.WebApp;
  const id = telegram?.initDataUnsafe?.user?.id;

  return typeof id === "number" && Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

export function getTelegramRequestHeaders(): Record<string, string> {
  const telegramId = getTelegramUserId();

  return telegramId === null
    ? {}
    : { [TELEGRAM_ID_HEADER]: String(telegramId) };
}
