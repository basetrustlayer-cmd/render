import crypto from "node:crypto";

export function verifyPaystackSignature(input: {
  payload: string;
  signature?: string;
  secret?: string;
}): boolean {
  if (!input.signature || !input.secret) {
    return false;
  }

  const expected = crypto
    .createHmac("sha512", input.secret)
    .update(input.payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(input.signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
