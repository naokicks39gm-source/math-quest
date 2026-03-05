export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type MailSendResult = {
  ok: boolean;
  attempts: number;
  errorCode: string | null;
  provider: string;
  providerMessageId: string | null;
  failureReason: string | null;
  bounceClass: string | null;
};

export interface MailProvider {
  id: string;
  send(input: MailPayload): Promise<MailSendResult>;
}
