const PAYSTACK_API_BASE_URL = "https://api.paystack.co";

export type PaystackTransferResponse = {
  status: boolean;
  message: string;
  data?: {
    transfer_code?: string;
    reference?: string;
    status?: string;
  };
};

export async function createPaystackTransfer(input: {
  amount: number;
  recipient: string;
  reference: string;
  reason: string;
}) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is required.");
  }

  const response = await fetch(
    `${PAYSTACK_API_BASE_URL}/transfer`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(input.amount * 100),
        recipient: input.recipient,
        reference: input.reference,
        reason: input.reason
      })
    }
  );

  const data =
    (await response.json()) as PaystackTransferResponse;

  if (!response.ok || !data.status || !data.data?.reference) {
    throw new Error(
      data.message || "Paystack transfer creation failed."
    );
  }

  return {
    providerReference:
      data.data.transfer_code ?? data.data.reference,
    providerStatus: data.data.status ?? "pending"
  };
}
