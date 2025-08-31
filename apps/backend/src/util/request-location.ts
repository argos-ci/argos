import type { Request } from "express";

export interface RequestLocation {
  city: string;
  country: string;
}

/**
 * Extract location information from request headers.
 */
export function extractLocationFromRequest(
  req: Request,
): RequestLocation | null {
  const city = req.headers["cf-ipcity"];
  const country = req.headers["cf-ipcountry"];

  if (typeof city !== "string" || typeof country !== "string") {
    return null;
  }

  return { city, country };
}
