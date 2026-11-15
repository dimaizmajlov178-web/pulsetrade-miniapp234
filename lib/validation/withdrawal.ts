import { z } from "zod";

const amountSchema = z
  .number({ error: "Введите сумму вывода" })
  .finite("Введите сумму числом")
  .positive("Введите сумму вывода")
  .max(10_000_000, "Слишком большая сумма вывода");

export const createWithdrawalSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("usdt"),
    amount: amountSchema,
    address: z
      .string({ error: "Укажите адрес USDT" })
      .trim()
      .min(10, "Укажите адрес USDT")
      .max(128, "Адрес USDT слишком длинный")
      .regex(/^[A-Za-z0-9:_-]+$/, "Адрес USDT содержит недопустимые символы"),
  }),
  z.object({
    method: z.literal("sbp"),
    amount: amountSchema,
    phone: z
      .string({ error: "Укажите телефон для СБП" })
      .trim()
      .regex(
        /^\+?[0-9][0-9\s()-]{9,19}$/,
        "Укажите телефон в формате +7 900 000-00-00"
      ),
    recipient: z
      .string({ error: "Укажите получателя" })
      .trim()
      .min(2, "Укажите получателя")
      .max(100, "Имя получателя слишком длинное"),
  }),
]);

export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;

export const withdrawalDecisionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("pay"),
  }),
  z.object({
    action: z.literal("reject"),
    reason: z
      .string({ error: "Укажите причину отклонения" })
      .trim()
      .min(2, "Укажите причину отклонения")
      .max(300, "Причина отклонения слишком длинная"),
  }),
]);

export type WithdrawalDecisionInput = z.infer<typeof withdrawalDecisionSchema>;
