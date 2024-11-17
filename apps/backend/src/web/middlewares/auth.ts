/* eslint-disable @typescript-eslint/no-namespace */

import type { RequestHandler } from "express";

import { AuthPayload, getAuthPayloadFromRequest } from "@/auth/request.js";

import { asyncHandler, HTTPError } from "../util.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload | null;
    }
  }
}

export const auth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const account = await getAuthPayloadFromRequest(req).catch((error) => {
    if (error instanceof HTTPError && error.statusCode === 401) {
      return null;
    }

    throw error;
  });
  req.auth = account;
  next();
});
