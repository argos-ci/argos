import {
  createHmac,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyDeploymentAccessToken } from "./deployment-access-token.ts";

const NOW = Date.UTC(2026, 10, 3, 12);
const payload = {
  projectId: "project-1",
  sub: "user-1",
  iat: NOW / 1000,
  exp: NOW / 1000 + 3600,
};

const signer = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const otherSigner = generateKeyPairSync("ec", { namedCurve: "prime256v1" });

const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

function jws(
  header: Record<string, unknown>,
  body: unknown,
  signWith: (input: string) => Buffer,
): string {
  const input = `${encode(header)}.${encode(body)}`;
  return `${input}.${signWith(input).toString("base64url")}`;
}

const es256 = (key: KeyObject) => (input: string) =>
  sign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" });

const hs256 = (secret: string) => (input: string) =>
  createHmac("sha256", secret).update(input).digest();

const validEs256 = jws({ alg: "ES256" }, payload, es256(signer.privateKey));
const [validHeader, , validSignature] = validEs256.split(".");

describe("verifyDeploymentAccessToken", () => {
  it("accepts an ES256 token signed with the backend key", () => {
    expect(
      verifyDeploymentAccessToken(validEs256, signer.publicKey, NOW),
    ).toEqual({
      projectId: "project-1",
      sub: "user-1",
      exp: payload.exp,
    });
  });

  it.each([
    [
      "ES256 signed with another key",
      jws({ alg: "ES256" }, payload, es256(otherSigner.privateKey)),
    ],
    [
      "ES256 with its payload swapped for another project",
      `${validHeader}.${encode({ ...payload, projectId: "project-2" })}.${validSignature}`,
    ],
    [
      "ES256 with a DER signature",
      jws({ alg: "ES256" }, payload, (input) =>
        sign("sha256", Buffer.from(input), signer.privateKey),
      ),
    ],
    [
      "an HS256 token from before ES256",
      jws({ alg: "HS256" }, payload, hs256("deployment-access-secret")),
    ],
    [
      "HS256 keyed with the public key",
      jws(
        { alg: "HS256" },
        payload,
        hs256(
          signer.publicKey.export({ type: "spki", format: "pem" }).toString(),
        ),
      ),
    ],
    ["alg none", `${encode({ alg: "none" })}.${encode(payload)}.`],
    [
      "an expired token",
      jws(
        { alg: "ES256" },
        { ...payload, exp: NOW / 1000 },
        es256(signer.privateKey),
      ),
    ],
    [
      "a payload without a project",
      jws(
        { alg: "ES256" },
        { sub: "user-1", exp: payload.exp },
        es256(signer.privateKey),
      ),
    ],
    ["two segments", validEs256.split(".").slice(0, 2).join(".")],
    ["a header that is not JSON", `bm9wZQ.${encode(payload)}.c2ln`],
  ])("rejects %s", (_name, token) => {
    expect(
      verifyDeploymentAccessToken(token, signer.publicKey, NOW),
    ).toBeNull();
  });
});
