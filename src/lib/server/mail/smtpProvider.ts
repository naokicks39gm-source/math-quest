import "server-only";

import { sendMailWithRetry } from "@/lib/server/smtp";
import { MailProvider } from "@/lib/server/mail/provider";

const classifyBounce = (errorCode: string | null) => {
  if (!errorCode) return { failureReason: null, bounceClass: null };
  const lowered = errorCode.toLowerCase();
  if (lowered.includes("550") || lowered.includes("user unknown") || lowered.includes("mailbox unavailable")) {
    return { failureReason: "recipient_rejected", bounceClass: "hard" };
  }
  if (lowered.includes("quota") || lowered.includes("timeout") || lowered.includes("try again") || lowered.includes("451") || lowered.includes("421")) {
    return { failureReason: "temporary_delivery_issue", bounceClass: "soft" };
  }
  if (lowered.includes("auth") || lowered.includes("535") || lowered.includes("login")) {
    return { failureReason: "provider_auth_error", bounceClass: "config" };
  }
  return { failureReason: "delivery_failed", bounceClass: "unknown" };
};

const inferProviderName = () => {
  const host = (process.env.MQ_SMTP_HOST ?? "").toLowerCase();
  if (host.includes("brevo") || host.includes("sendinblue")) return "brevo_smtp";
  if (host.includes("amazonaws")) return "ses_smtp";
  if (host.includes("gmail")) return "gmail_smtp";
  return "smtp";
};

export const smtpMailProvider: MailProvider = {
  id: inferProviderName(),
  async send(input) {
    const send = await sendMailWithRetry(input);
    const classified = classifyBounce(send.errorCode);
    return {
      ok: send.ok,
      attempts: send.attempts,
      errorCode: send.errorCode,
      provider: inferProviderName(),
      providerMessageId: null,
      failureReason: send.ok ? null : classified.failureReason,
      bounceClass: send.ok ? null : classified.bounceClass
    };
  }
};
