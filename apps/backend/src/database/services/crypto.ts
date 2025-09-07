import { randomBytes, randomInt } from "node:crypto";

/**
 * Generates a random hex string of the given length.
 */
export function generateRandomHexString(length: number): string {
  const token = randomBytes(length / 2);
  return token.toString("hex");
}

/**
 * Generates a random string of digits of the given length.
 */
export function generateRandomDigits(length: number): string {
  // Generate a random integer between 0 and 999999
  const randomNumber = randomInt(0, 10 ** length);
  return randomNumber.toString().padStart(length, "0");
}
