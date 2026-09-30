import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, keyHex, extra] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !keyHex || extra) return false;

  try {
    const storedKey = Buffer.from(keyHex, "hex");
    if (storedKey.length !== KEY_LENGTH) return false;
    const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
    return timingSafeEqual(storedKey, derivedKey);
  } catch {
    return false;
  }
}

export function safeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
