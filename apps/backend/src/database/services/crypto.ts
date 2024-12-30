import { randomBytes } from "node:crypto";
import { promisify } from "node:util";

const generateRandomBytes = promisify(randomBytes);

/**
 * Generates a random hex string of the given length.
 */
export async function generateRandomHexString(length: number): Promise<string> {
  const token = await generateRandomBytes(length / 2);
  return token.toString("hex");
}
