import jwt from "jsonwebtoken";

import config from "@argos-ci/config";

type JWTData = {
  version: number;
  account: {
    id: string;
    slug: string;
    name: string | null;
  };
};

export const createJWT = (data: JWTData) => {
  return jwt.sign(data, config.get("server.sessionSecret"), {
    expiresIn: "60d",
  });
};

export const verifyJWT = (token: string) => {
  try {
    return jwt.verify(token, config.get("server.sessionSecret")) as JWTData;
  } catch {
    return null;
  }
};
