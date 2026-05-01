import jwt from "jsonwebtoken";
import { z } from "zod";

import config from "@/config";

const TTL_SECONDS = 60 * 60;

const PayloadSchema = z.object({
  projectId: z.string(),
  sub: z.string(),
});

export type DeploymentAccessTokenPayload = z.infer<typeof PayloadSchema>;

function getSecret(): string {
  const secret = config.get("deployments.accessTokenSecret");
  if (!secret) {
    throw new Error("deployments.accessTokenSecret is not configured");
  }
  return secret;
}

export function signDeploymentAccessToken(
  payload: DeploymentAccessTokenPayload,
): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: TTL_SECONDS,
    algorithm: "HS256",
  });
}

export function verifyDeploymentAccessToken(
  token: string,
): DeploymentAccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof decoded !== "object" || decoded === null) {
      return null;
    }
    const parsed = PayloadSchema.safeParse(decoded);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
