import jwt from "jsonwebtoken";

import config from "@/config";

const TTL_SECONDS = 60 * 60;

export function signDeploymentAccessToken(payload: {
  projectId: string;
  sub: string;
}): string {
  const privateKey = config.get("deployments.accessTokenPrivateKey");
  if (!privateKey) {
    throw new Error("deployments.accessTokenPrivateKey is not configured");
  }
  return jwt.sign(payload, privateKey, {
    expiresIn: TTL_SECONDS,
    algorithm: "ES256",
  });
}
