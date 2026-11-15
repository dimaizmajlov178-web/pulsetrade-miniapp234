import { z } from "zod";

import { promoCodeLimits, promoCodeStatuses } from "@/lib/promo";

const deltaSchema = z
  .number({ error: "Введите сумму корректировки" })
  .finite("Введите сумму числом")
  .min(-1_000_000, "Слишком большое списание")
  .max(1_000_000, "Слишком большое начисление")
  .default(0);

export const adminBalanceAdjustmentSchema = z
  .object({
    demoDelta: deltaSchema,
    realDelta: deltaSchema,
    reason: z
      .string({ error: "Укажите причину корректировки" })
      .trim()
      .min(2, "Укажите причину корректировки")
      .max(200, "Причина корректировки слишком длинная"),
  })
  .refine(
    (value) => value.demoDelta !== 0 || value.realDelta !== 0,
    "Укажите изменение хотя бы по одному балансу"
  );

export type AdminBalanceAdjustmentInput = z.infer<
  typeof adminBalanceAdjustmentSchema
>;

const limitValueSchema = z
  .number({ error: "Введите значение лимита" })
  .finite("Введите значение числом")
  .positive("Лимит должен быть больше нуля")
  .max(10_000_000, "Слишком большой лимит");

export const adminLimitsSchema = z
  .object({
    minStake: limitValueSchema,
    maxStake: limitValueSchema,
    withdrawalMin: limitValueSchema,
    withdrawalMax: limitValueSchema,
  })
  .refine(
    (value) => value.minStake < value.maxStake,
    "Минимальная ставка должна быть меньше максимальной"
  )
  .refine(
    (value) => value.withdrawalMin < value.withdrawalMax,
    "Минимальный вывод должен быть меньше максимального"
  );

export type AdminLimitsInput = z.infer<typeof adminLimitsSchema>;

const promoAmountSchema = z
  .number({ error: "Введите сумму бонуса" })
  .finite("Введите сумму числом")
  .positive("Бонус должен быть больше нуля")
  .max(1_000_000, "Слишком большой бонус");

export const adminPromoCreateSchema = z.object({
  code: z
    .string({ error: "Введите промокод" })
    .trim()
    .min(promoCodeLimits.minLength, "Промокод слишком короткий")
    .max(promoCodeLimits.maxLength, "Промокод слишком длинный")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Промокод может содержать только буквы, цифры, дефис и подчёркивание"
    ),
  bonusAmount: promoAmountSchema,
  status: z.enum(promoCodeStatuses).default("active"),
});

export type AdminPromoCreateInput = z.infer<typeof adminPromoCreateSchema>;

export const adminPromoUpdateSchema = z.object({
  bonusAmount: promoAmountSchema,
  status: z.enum(promoCodeStatuses),
});

export type AdminPromoUpdateInput = z.infer<typeof adminPromoUpdateSchema>;
