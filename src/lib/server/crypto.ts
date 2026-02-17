import crypto from "node:crypto";

const KEY_ENV = "MQ_EMAIL_ENC_KEY";

const getKey = () => {
  const keyRaw = process.env[KEY_ENV];
  if (!keyRaw) {
    throw new Error(`${KEY_ENV} is required`);
  }
  const key = Buffer.from(keyRaw, "base64");
  if (key.length !== 32) {
    throw new Error(`${KEY_ENV} must be base64-encoded 32-byte key`);
  }
  return key;
};

export const encryptEmail = (email: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(email, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
};

export const decryptEmail = (payload: string) => {
  const [ivB64, tagB64, textB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !textB64) {
    throw new Error("Invalid encrypted payload");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(textB64, "base64")),
    decipher.final()
  ]);
  return plain.toString("utf8");
};

export const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  if (local.length <= 2) return `${local[0] ?? "*"}*@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
};

export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

