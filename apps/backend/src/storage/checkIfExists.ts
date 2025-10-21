import { get } from "./get.js";
import type { GetParams } from "./get.js";

/**
 * Check if an object exists in S3.
 */
export async function checkIfExists({ s3, ...other }: GetParams) {
  try {
    await get({ s3, ...other });
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "Code" in error &&
      error.Code === "AccessDenied"
    ) {
      return false;
    }
    throw error;
  }
}
