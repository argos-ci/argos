import jwt from "jsonwebtoken";

import config from "@/config/index.js";

export const JWT_VERSION = 2;

type JWTData = {
  version: typeof JWT_VERSION;
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
    if (typeof payload !== "object" || payload["version"] !== JWT_VERSION) {
      return null;
    }
    return payload as JWTData;
  } catch {
    return null;
  }
};
