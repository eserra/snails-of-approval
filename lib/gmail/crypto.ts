import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY env var is required");
  }
  // Key must be 32 bytes for AES-256. Accept hex-encoded (64 chars) or base64.
  if (key.length === 64) return Buffer.from(key, "hex");
  const buf = Buffer.from(key, "base64");
  if (buf.length === 32) return buf;
  throw new Error(
    "GMAIL_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)"
  );
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv + tag + ciphertext)
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(encoded: string): string {
  const key = getKey();
  const data = Buffer.from(encoded, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}
