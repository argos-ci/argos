import { randomBytes, randomInt } from "node:crypto";
import { promisify } from "node:util";

const generateRandomBytes = promisify(randomBytes);

/**
 * Generates a random hex string of the given length.
 */
export async function generateRandomHexString(length: number): Promise<string> {
  const token = await generateRandomBytes(length / 2);
  return token.toString("hex");
}

/**
 * Generates a random string of digits of the given length.
 */
export async function generateRandomDigits(length: number): Promise<string> {
  // Generate a random integer between 0 and 999999
  const randomNumber = randomInt(0, 10 ** length);
  return randomNumber.toString().padStart(length, "0");
}
