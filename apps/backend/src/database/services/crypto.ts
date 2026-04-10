import { createHash, randomInt } from "node:crypto";

/**
 * Hashes a token using SHA-256.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a random string of digits of the given length.
 */
export function generateRandomDigits(length: number): string {
  // Generate a random integer between 0 and 999999
  const randomNumber = randomInt(0, 10 ** length);
  return randomNumber.toString().padStart(length, "0");
}

/**
 * Generates a random string containing a-z and 1-9 of the given length.
 */
export function generateRandomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomInt(0, chars.length));
  }
  return result;
}
