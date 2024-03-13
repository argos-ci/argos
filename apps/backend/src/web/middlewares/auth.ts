/* eslint-disable @typescript-eslint/no-namespace */

import { AuthPayload, getAuthPayloadFromRequest } from "@/auth/request.js";

import { asyncHandler } from "../util.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload | null;
    }
  }
}

export const auth = asyncHandler(async (req, _res, next) => {
  const account = await getAuthPayloadFromRequest(req);
  req.auth = account;
  next();
});
