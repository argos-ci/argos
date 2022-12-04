import jwt from "jsonwebtoken";

import config from "@argos-ci/config";
import type { User } from "@argos-ci/database/models";

interface JWTData {
  id: string;
  login: string;
  name: string | null;
}

export const createJWT = (user: User) => {
  const data: JWTData = {
    id: user.id,
    login: user.login,
    name: user.name,
  };
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
