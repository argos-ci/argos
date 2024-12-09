import { RequestHandler } from "express";

import { boom } from "../util";

export const allowOnlyPost: RequestHandler = (req, _res, next) => {
  if (req.method !== "POST" && req.method !== "OPTIONS") {
    throw boom(405, "Method Not Allowed");
  }
  next();
};
