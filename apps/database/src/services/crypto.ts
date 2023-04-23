import { randomBytes } from "node:crypto";
import { promisify } from "node:util";

const generateRandomBytes = promisify(randomBytes);

export const generateRandomHexString = async () => {
  const token = await generateRandomBytes(20);
  return token.toString("hex");
};
