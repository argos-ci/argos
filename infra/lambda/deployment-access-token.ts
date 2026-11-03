import { verify, type KeyObject } from "node:crypto";

export type DeploymentAccessTokenPayload = {
  projectId: string;
  sub: string;
  exp: number;
};

function decodeJson(segment: string): unknown {
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

/**
 * Verifies an ES256 deployment access token against the public half of the
 * backend's signing key.
 */
export function verifyDeploymentAccessToken(
  token: string,
  publicKey: KeyObject,
  now = Date.now(),
): DeploymentAccessTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [
    string,
    string,
    string,
  ];

  const header = decodeJson(encodedHeader);
  if (
    typeof header !== "object" ||
    header === null ||
    !("alg" in header) ||
    header.alg !== "ES256"
  ) {
    return null;
  }
  // JWS carries an ECDSA signature as raw r || s, not DER.
  const signature = Buffer.from(encodedSignature, "base64url");
  if (
    signature.length !== 64 ||
    !verify(
      "sha256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      signature,
    )
  ) {
    return null;
  }

  const payload = decodeJson(encodedPayload);
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("projectId" in payload) ||
    typeof payload.projectId !== "string" ||
    !("sub" in payload) ||
    typeof payload.sub !== "string" ||
    !("exp" in payload) ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }
  if (Math.floor(now / 1000) >= payload.exp) {
    return null;
  }
  return {
    projectId: payload.projectId,
    sub: payload.sub,
    exp: payload.exp,
  };
}
