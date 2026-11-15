import { z } from "zod";

import { REFERRAL_MIN_WITHDRAWAL } from "@/lib/referrals";

export const registerReferralSchema = z.object({
  code: z
    .string({ error: "Укажите реферальный код" })
    .trim()
    .min(1, "Укажите реферальный код")
    .max(64, "Реферальный код слишком длинный"),
});

export type RegisterReferralInput = z.infer<typeof registerReferralSchema>;

export const createReferralWithdrawalSchema = z.object({
  amount: z
    .number({ error: "Введите сумму вывода" })
    .finite("Введите сумму числом")
    .min(
      REFERRAL_MIN_WITHDRAWAL,
      `Минимальная сумма вывода реферальных — ${REFERRAL_MIN_WITHDRAWAL} USDT`
    )
    .max(10_000_000, "Слишком большая сумма вывода"),
  address: z
    .string({ error: "Укажите адрес USDT" })
    .trim()
    .min(10, "Укажите адрес USDT")
    .max(128, "Адрес USDT слишком длинный")
    .regex(/^[A-Za-z0-9:_-]+$/, "Адрес USDT содержит недопустимые символы"),
});

export type CreateReferralWithdrawalInput = z.infer<
  typeof createReferralWithdrawalSchema
>;
