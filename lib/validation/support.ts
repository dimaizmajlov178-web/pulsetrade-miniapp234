import { z } from "zod";

import { supportMessageMaxLength } from "@/lib/support";

const messageSchema = z
  .string({ error: "Введите сообщение" })
  .trim()
  .min(1, "Введите сообщение")
  .max(
    supportMessageMaxLength,
    `Сообщение не должно превышать ${supportMessageMaxLength} символов`
  );

export const supportMessageSchema = z.object({
  message: messageSchema,
});

export type SupportMessageInput = z.infer<typeof supportMessageSchema>;

export const supportCloseSchema = z.object({
  action: z.literal("close"),
});

export type SupportCloseInput = z.infer<typeof supportCloseSchema>;

export const adminSupportActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("take"),
  }),
  z.object({
    action: z.literal("reply"),
    message: messageSchema,
  }),
  z.object({
    action: z.literal("close"),
  }),
]);

export type AdminSupportActionInput = z.infer<typeof adminSupportActionSchema>;
