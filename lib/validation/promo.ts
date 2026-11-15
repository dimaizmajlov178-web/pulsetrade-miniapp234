import { z } from "zod";

import { promoCodeLimits } from "@/lib/promo";

export const activatePromoCodeSchema = z.object({
  code: z
    .string({ error: "Введите промокод" })
    .trim()
    .min(promoCodeLimits.minLength, "Промокод слишком короткий")
    .max(promoCodeLimits.maxLength, "Промокод слишком длинный")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Промокод может содержать только буквы, цифры, дефис и подчёркивание"
    ),
});

export type ActivatePromoInput = z.infer<typeof activatePromoCodeSchema>;
