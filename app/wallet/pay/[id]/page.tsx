import { DepositCheckout } from "@/components/deposit-checkout";

export default async function DepositCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <DepositCheckout depositId={id} />;
}
