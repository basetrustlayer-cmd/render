import crypto from "node:crypto";

export function verifyTrustLayerWebhookSignature(input: {
  rawBody: string;
  signature: string | undefined;
  secret: string;
}): boolean {
  if (!input.signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", input.secret)
    .update(input.rawBody)
    .digest("hex");

  const left = Buffer.from(input.signature);
  const right = Buffer.from(expected);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}
