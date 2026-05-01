import jwt from "jsonwebtoken";

import config from "@/config";

const TTL_SECONDS = 60 * 60;

function getSecret(): string {
  const secret = config.get("deployments.accessTokenSecret");
  if (!secret) {
    throw new Error("deployments.accessTokenSecret is not configured");
  }
  return secret;
}

export function signDeploymentAccessToken(payload: {
  projectId: string;
  sub: string;
}): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: TTL_SECONDS,
    algorithm: "HS256",
  });
}
