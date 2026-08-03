import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env["LUMI_SETTINGS_ENCRYPTION_KEY"];
  if (!key) {
    throw new Error(
      "LUMI_SETTINGS_ENCRYPTION_KEY environment variable is required for API key encryption",
    );
  }
  const salt = Buffer.from("lumi-settings-salt", "utf-8").subarray(0, SALT_LENGTH);
  return scryptSync(key, salt, KEY_LENGTH);
}

export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf-8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, "hex")]);
  return combined.toString("base64");
}

export function decryptApiKey(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, "base64");
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encryptedHex = combined.subarray(IV_LENGTH + TAG_LENGTH).toString("hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return apiKey.slice(0, 2) + "****";
  const prefix = apiKey.slice(0, 8);
  const suffix = apiKey.slice(-4);
  return `${prefix}...${suffix}`;
}
