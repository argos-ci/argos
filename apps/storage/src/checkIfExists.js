import { get } from "./get";

export async function checkIfExists({ s3, ...other }) {
  try {
    await get({ s3, ...other });
    return true;
  } catch (error) {
    if (error.Code === "AccessDenied") return false;
    throw error;
  }
}
