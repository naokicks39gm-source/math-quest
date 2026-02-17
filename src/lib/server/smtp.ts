import "server-only";

import net from "node:net";
import tls from "node:tls";

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

type SendResult = {
  ok: boolean;
  errorCode: string | null;
};

const getConfig = (): SmtpConfig => {
  const host = process.env.MQ_SMTP_HOST ?? "";
  const port = Number(process.env.MQ_SMTP_PORT ?? "0");
  const user = process.env.MQ_SMTP_USER ?? "";
  const pass = process.env.MQ_SMTP_PASS ?? "";
  const from = process.env.MQ_SMTP_FROM ?? "";
  const secure = String(process.env.MQ_SMTP_SECURE ?? "false") === "true" || port === 465;
  if (!host || !port || !user || !pass || !from) {
    throw new Error("SMTP config is incomplete");
  }
  return { host, port, user, pass, from, secure };
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getLines = (buffer: string) => buffer.split(/\r?\n/).filter(Boolean);

const readResponse = (socket: net.Socket | tls.TLSSocket): Promise<string> =>
  new Promise((resolve, reject) => {
    let acc = "";
    const onData = (chunk: Buffer) => {
      acc += chunk.toString("utf8");
      const lines = getLines(acc);
      if (lines.length === 0) return;
      const last = lines[lines.length - 1];
      if (/^\d{3}\s/.test(last)) {
        cleanup();
        resolve(acc);
      }
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const onClose = () => {
      cleanup();
      reject(new Error("SMTP socket closed"));
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    };
    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("close", onClose);
  });

const assert2xx3xx = (response: string) => {
  const lines = getLines(response);
  const last = lines[lines.length - 1] ?? "";
  if (!/^[23]\d{2}\s/.test(last)) {
    throw new Error(`SMTP failure: ${last}`);
  }
};

const sendCommand = async (
  socket: net.Socket | tls.TLSSocket,
  command: string,
  expected: "ok"
) => {
  socket.write(command);
  const response = await readResponse(socket);
  if (expected === "ok") assert2xx3xx(response);
  return response;
};

const connectSmtp = (config: SmtpConfig): Promise<net.Socket | tls.TLSSocket> =>
  new Promise((resolve, reject) => {
    const onConnect = (socket: net.Socket | tls.TLSSocket) => {
      socket.setEncoding("utf8");
      resolve(socket);
    };
    if (config.secure) {
      const socket = tls.connect(
        {
          host: config.host,
          port: config.port,
          servername: config.host
        },
        () => onConnect(socket)
      );
      socket.once("error", reject);
      return;
    }
    const socket = net.connect({ host: config.host, port: config.port }, () => onConnect(socket));
    socket.once("error", reject);
  });

const sendOnce = async (input: MailInput): Promise<void> => {
  const config = getConfig();
  const socket = await connectSmtp(config);
  try {
    assert2xx3xx(await readResponse(socket));
    await sendCommand(socket, `EHLO math-quest.local\r\n`, "ok");
    await sendCommand(socket, `AUTH LOGIN\r\n`, "ok");
    await sendCommand(socket, `${Buffer.from(config.user).toString("base64")}\r\n`, "ok");
    await sendCommand(socket, `${Buffer.from(config.pass).toString("base64")}\r\n`, "ok");
    await sendCommand(socket, `MAIL FROM:<${config.from}>\r\n`, "ok");
    await sendCommand(socket, `RCPT TO:<${input.to}>\r\n`, "ok");
    await sendCommand(socket, `DATA\r\n`, "ok");
    const body = [
      `From: ${config.from}`,
      `To: ${input.to}`,
      `Subject: ${input.subject}`,
      "MIME-Version: 1.0",
      'Content-Type: multipart/alternative; boundary="mq-boundary"',
      "",
      "--mq-boundary",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      input.text,
      "",
      "--mq-boundary",
      "Content-Type: text/html; charset=UTF-8",
      "",
      input.html,
      "",
      "--mq-boundary--",
      "",
      ".",
      ""
    ].join("\r\n");
    await sendCommand(socket, body, "ok");
    await sendCommand(socket, "QUIT\r\n", "ok");
  } finally {
    socket.end();
  }
};

export const sendMailWithRetry = async (input: MailInput, maxRetries = 3): Promise<SendResult & { attempts: number }> => {
  let attempts = 0;
  for (let retry = 0; retry < maxRetries; retry++) {
    attempts = retry + 1;
    try {
      await sendOnce(input);
      return { ok: true, errorCode: null, attempts };
    } catch (error) {
      if (retry === maxRetries - 1) {
        return {
          ok: false,
          errorCode: error instanceof Error ? error.message.slice(0, 120) : "smtp_error",
          attempts
        };
      }
      await wait(2 ** retry * 300);
    }
  }
  return { ok: false, errorCode: "smtp_unknown", attempts };
};

