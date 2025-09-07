import type { Request } from "express";

export interface RequestLocation {
  ip: string;
  city: string;
  country: string;
}

/**
 * Extract location information from request headers.
 */
export function extractLocationFromRequest(
  req: Request,
): RequestLocation | null {
  const ip = req.ip;
  const city = req.headers["cf-ipcity"];
  const country = req.headers["cf-ipcountry"];

  if (
    typeof ip !== "string" ||
    typeof city !== "string" ||
    typeof country !== "string"
  ) {
    return null;
  }

  return { ip, city, country };
}
