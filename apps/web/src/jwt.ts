import jwt from "jsonwebtoken";

import config from "@argos-ci/config";

export const createJWT = (id: string) => {
  return jwt.sign({ id }, config.get("server.sessionSecret"), {
    expiresIn: "60d",
  });
};

export const verifyJWT = (token: string) => {
  try {
    return jwt.verify(token, config.get("server.sessionSecret")) as {
      id: string;
    };
  } catch {
    return null;
  }
};
