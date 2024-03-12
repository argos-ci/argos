import type { TransactionOrKnex } from "objection";

import { File } from "@/database/models/index.js";

export const getUnknownFileKeys = async (
  keys: string[],
  trx?: TransactionOrKnex,
): Promise<string[]> => {
  if (keys.length === 0) {
    return [];
  }
  const existingFiles = await File.query(trx)
    .select("key")
    .whereIn("key", keys);
  const existingKeys = existingFiles.map((file) => file.key);
  return Array.from(new Set(keys.filter((key) => !existingKeys.includes(key))));
};
