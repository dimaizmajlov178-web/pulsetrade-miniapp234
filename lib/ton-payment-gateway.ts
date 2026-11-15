import type { DepositProvider, DepositRecord } from "@/lib/models";

const CRYPTO_PAY_API_URL = "https://pay.crypt.bot/api";
const SANDBOX_CONFIRMATION_DELAY_MS = 4_000;

export type DepositInvoice = {
  provider: DepositProvider;
  providerInvoiceId?: string;
  paymentLink: string;
  address: string | null;
  memo: string | null;
};

export type DepositInvoiceStatus = {
  status: "pending" | "paid" | "expired";
  txHash?: string;
};

type CryptoPayInvoice = {
  invoice_id: number;
  hash?: string;
  status: "active" | "paid" | "expired";
  bot_invoice_url?: string;
  mini_app_invoice_url?: string;
  pay_url?: string;
};

type CryptoPayResponse<T> = {
  ok: boolean;
  result?: T;
  error?: {
    code?: number;
    name?: string;
  };
};

function getCryptoPayToken(): string | null {
  const token = process.env.CRYPTO_PAY_API_TOKEN?.trim();
  return token ? token : null;
}

function getDepositWallet(): string | null {
  const wallet = process.env.TON_DEPOSIT_WALLET?.trim();
  return wallet ? wallet : null;
}

export function isSandboxPaymentGateway(): boolean {
  return getCryptoPayToken() === null;
}

async function cryptopayRequest<T>(
  method: string,
  payload: Record<string, unknown>
): Promise<T> {
  const token = getCryptoPayToken();

  if (!token) {
    throw new Error("Платёжный шлюз не настроен");
  }

  const response = await fetch(`${CRYPTO_PAY_API_URL}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Crypto-Pay-API-Token": token,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Платёжный шлюз недоступен");
  }

  const body = (await response.json()) as CryptoPayResponse<T>;

  if (!body.ok || body.result === undefined) {
    throw new Error("Платёжный шлюз вернул ошибку");
  }

  return body.result;
}

function buildSandboxMemo(depositId: string): string {
  return `PT-${depositId.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

export async function createDepositInvoice(input: {
  depositId: string;
  amount: number;
  uid: number;
}): Promise<DepositInvoice> {
  if (isSandboxPaymentGateway()) {
    return {
      provider: "sandbox",
      paymentLink: `/wallet/pay/${input.depositId}`,
      address: getDepositWallet(),
      memo: buildSandboxMemo(input.depositId),
    };
  }

  const invoice = await cryptopayRequest<CryptoPayInvoice>("createInvoice", {
    currency_type: "crypto",
    asset: "USDT",
    amount: input.amount.toFixed(2),
    description: `Пополнение баланса · UID ${input.uid}`,
    payload: input.depositId,
    allow_comments: false,
    allow_anonymous: false,
    expires_in: 1_800,
  });

  const paymentLink =
    invoice.mini_app_invoice_url ?? invoice.bot_invoice_url ?? invoice.pay_url;

  if (!paymentLink) {
    throw new Error("Платёжный шлюз не вернул ссылку на оплату");
  }

  return {
    provider: "cryptopay",
    providerInvoiceId: String(invoice.invoice_id),
    paymentLink,
    address: null,
    memo: null,
  };
}

export async function getDepositInvoiceStatus(
  deposit: DepositRecord
): Promise<DepositInvoiceStatus> {
  if (deposit.provider === "sandbox") {
    if (!deposit.checkStartedAt) {
      return { status: "pending" };
    }

    const elapsed = Date.now() - Date.parse(deposit.checkStartedAt);

    if (elapsed >= SANDBOX_CONFIRMATION_DELAY_MS) {
      return {
        status: "paid",
        txHash: `sandbox:${deposit.id}`,
      };
    }

    return { status: "pending" };
  }

  if (!deposit.providerInvoiceId) {
    throw new Error("Не найден счёт платёжного шлюза");
  }

  const invoices = await cryptopayRequest<{ items: CryptoPayInvoice[] }>(
    "getInvoices",
    {
      invoice_ids: [Number(deposit.providerInvoiceId)],
    }
  );

  const invoice = invoices.items?.[0];

  if (!invoice) {
    return { status: "pending" };
  }

  if (invoice.status === "paid") {
    return {
      status: "paid",
      txHash: invoice.hash,
    };
  }

  if (invoice.status === "expired") {
    return { status: "expired" };
  }

  return { status: "pending" };
}
