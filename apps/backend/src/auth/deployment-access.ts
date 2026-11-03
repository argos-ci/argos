import jwt from "jsonwebtoken";

import config from "@/config";

const TTL_SECONDS = 60 * 60;

export function signDeploymentAccessToken(payload: {
  projectId: string;
  sub: string;
}): string {
  const privateKey = config.get("deployments.accessTokenPrivateKey");
  if (privateKey) {
    return jwt.sign(payload, privateKey, {
      expiresIn: TTL_SECONDS,
      algorithm: "ES256",
    });
  }

  // HS256 until the private key is deployed. The edge accepts both meanwhile,
  // so the two can roll out in either order.
  const secret = config.get("deployments.accessTokenSecret");
  if (!secret) {
    throw new Error("deployments.accessTokenPrivateKey is not configured");
  }
  return jwt.sign(payload, secret, {
    expiresIn: TTL_SECONDS,
    algorithm: "HS256",
  });
}
