import crypto from "node:crypto";

export function verifyHmac({
  payload,
  signature,
  secret,
  digest = "hex"
}: {
  payload: string;
  signature: string | undefined;
  secret: string | undefined;
  digest?: crypto.BinaryToTextEncoding;
}): boolean {
  if (!signature || !secret) {
    return false;
  }

  const expected = crypto.createHmac("sha512", secret).update(payload).digest(digest);

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function deriveTrustLayerEventId(input: {
  explicitEventId?: string;
  id?: string;
  rawBody: string;
}): string {
  return input.explicitEventId ?? input.id ?? crypto
    .createHash("sha256")
    .update(input.rawBody)
    .digest("hex");
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export function mapTrustLayerEscrowStatus(status: string | undefined) {
  if (status === "FUNDED") return "FUNDED";
  if (status === "DELIVERED") return "DELIVERED";
  if (status === "DISPUTED") return "DISPUTED";
  if (status === "CONFIRMED") return "CONFIRMED";
  if (status === "COMPLETE") return "COMPLETE";
  if (status === "REFUNDED") return "REFUNDED";

  return undefined;
}
