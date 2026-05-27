type HubtelSmsResult = {
  provider: "HUBTEL";
  status: "SENT";
};

type DevSmsResult = {
  provider: "DEV";
  status: "SKIPPED";
};

export async function sendOtpSms(input: {
  phone: string;
  code: string;
}): Promise<HubtelSmsResult | DevSmsResult> {
  const otpProvider = process.env.OTP_PROVIDER ?? "hubtel";

  if (otpProvider === "mock" || otpProvider === "dev") {
    return {
      provider: "DEV",
      status: "SKIPPED"
    };
  }

  const clientId = process.env.HUBTEL_CLIENT_ID;
  const clientSecret = process.env.HUBTEL_CLIENT_SECRET;
  const sender = process.env.HUBTEL_SENDER_ID ?? "Render";

  if (!clientId || !clientSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Hubtel SMS credentials are required in production.");
    }

    return {
      provider: "DEV",
      status: "SKIPPED"
    };
  }

  const response = await fetch("https://sms.hubtel.com/v1/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: sender,
      to: input.phone,
      content: `Your Render verification code is ${input.code}. It expires in 10 minutes.`
    })
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Hubtel SMS failed ${response.status}: ${text}`);
  }

  return {
    provider: "HUBTEL",
    status: "SENT"
  };
}
