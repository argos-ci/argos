import { get } from "./get";
import type { GetParams } from "./get";

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
