import { z } from "zod";

import { depositLimits } from "@/lib/deposits";

export const createDepositSchema = z.object({
  amount: z
    .number({ error: "Введите сумму пополнения" })
    .finite("Введите сумму числом")
    .min(
      depositLimits.min,
      `Минимальная сумма пополнения — ${depositLimits.min} USDT`
    )
    .max(
      depositLimits.max,
      `Максимальная сумма пополнения — ${depositLimits.max} USDT`
    ),
});

export type CreateDepositInput = z.infer<typeof createDepositSchema>;
