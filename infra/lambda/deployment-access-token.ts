import {
  createHmac,
  timingSafeEqual,
  verify,
  type KeyObject,
} from "node:crypto";

export type DeploymentAccessTokenPayload = {
  projectId: string;
  sub: string;
  exp: number;
};

export type DeploymentAccessTokenKeys = {
  /** The P-256 public key matching the backend's ES256 signing key. */
  publicKey: KeyObject;
  /**
   * The HS256 secret the backend signed with before ES256. Accepted only while
   * non-empty, so the edge can take both while the backend switches over.
   */
  legacySecret: string;
};

function decodeJson(segment: string): unknown {
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

function checkSignature(
  alg: unknown,
  signingInput: string,
  signature: Buffer,
  keys: DeploymentAccessTokenKeys,
): boolean {
  switch (alg) {
    case "ES256":
      // JWS carries an ECDSA signature as raw r || s, not DER.
      return (
        signature.length === 64 &&
        verify(
          "sha256",
          Buffer.from(signingInput),
          { key: keys.publicKey, dsaEncoding: "ieee-p1363" },
          signature,
        )
      );
    case "HS256": {
      if (!keys.legacySecret) {
        return false;
      }
      const expected = createHmac("sha256", keys.legacySecret)
        .update(signingInput)
        .digest();
      return (
        signature.length === expected.length &&
        timingSafeEqual(signature, expected)
      );
    }
    default:
      return false;
  }
}

export function verifyDeploymentAccessToken(
  token: string,
  keys: DeploymentAccessTokenKeys,
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
  if (typeof header !== "object" || header === null || !("alg" in header)) {
    return null;
  }
  if (
    !checkSignature(
      header.alg,
      `${encodedHeader}.${encodedPayload}`,
      Buffer.from(encodedSignature, "base64url"),
      keys,
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
