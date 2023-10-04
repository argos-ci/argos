// eslint-disable-next-line import/default
import jwt from "jsonwebtoken";

import config from "@/config/index.js";

type JWTData = {
  version: 1;
  account: {
    id: string;
    slug: string;
    name: string | null;
  };
};

export const createJWT = (data: JWTData) => {
  return jwt.sign(data, config.get("server.sessionSecret"), {
    expiresIn: "60d",
    encoding: "utf-8",
  });
};

export const verifyJWT = (token: string) => {
  try {
    const payload = jwt.verify(token, config.get("server.sessionSecret"));
    if (typeof payload !== "object" || payload["version"] !== 1) {
      return null;
    }
    return payload as JWTData;
  } catch {
    return null;
  }
};
