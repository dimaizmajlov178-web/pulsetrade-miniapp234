import { z } from "zod";

import { marketPairIds } from "@/lib/market-data";
import {
  expiryOptions,
  tradeDirections,
  type TradeDirection,
} from "@/lib/trading";

const expiryMinutesOptions: number[] = expiryOptions.map(
  (option) => option.minutes
);

export const createTradeSchema = z.object({
  pairId: z.enum(marketPairIds, { error: "Выберите торговую пару" }),
  direction: z.enum(tradeDirections, { error: "Выберите направление" }),
  stake: z
    .number({ error: "Введите сумму ставки" })
    .finite("Введите сумму числом")
    .positive("Введите сумму ставки")
    .max(10_000_000, "Слишком большая ставка"),
  expiryMinutes: z
    .number({ error: "Выберите время экспирации" })
    .int("Выберите время экспирации")
    .refine(
      (value) => expiryMinutesOptions.includes(value),
      "Минимальное время экспирации — 1 минута"
    ),
});

export type CreateTradeInput = z.infer<typeof createTradeSchema>;

export type TradeFormValues = {
  direction: TradeDirection;
  stake: number;
  expiryMinutes: number;
};
