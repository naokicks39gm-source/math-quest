import "server-only";

import { MailProvider } from "@/lib/server/mail/provider";
import { smtpMailProvider } from "@/lib/server/mail/smtpProvider";

export const getMailProvider = (): MailProvider => {
  const provider = (process.env.MQ_MAIL_PROVIDER ?? "smtp").toLowerCase();
  if (provider === "smtp" || provider === "brevo") return smtpMailProvider;
  return smtpMailProvider;
};
