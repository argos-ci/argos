import { get } from "./get.js";
import type { GetParams } from "./get.js";

export const checkIfExists = async ({ s3, ...other }: GetParams) => {
  try {
    await get({ s3, ...other });
    return true;
  } catch (error: any) {
    if (error.Code === "AccessDenied") return false;
    throw error;
  }
};
