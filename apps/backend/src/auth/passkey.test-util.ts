import {
  createHash,
  createSign,
  generateKeyPairSync,
  randomBytes,
  type KeyObject,
} from "node:crypto";
import { encodeCBOR, type CBORType } from "@levischuck/tiny-cbor";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

/**
 * A minimal in-process WebAuthn authenticator, so the passkey flows can be
 * tested against the real verification path — actual ES256 signatures, actual
 * CBOR attestation — instead of stubbing out the library that does the checking.
 *
 * It implements only what our ceremonies use: `none` attestation, a discoverable
 * ES256 credential, and the flags a platform passkey provider sets.
 */

const FLAG_USER_PRESENT = 0x01;
const FLAG_USER_VERIFIED = 0x04;
const FLAG_BACKUP_ELIGIBLE = 0x08;
const FLAG_BACKED_UP = 0x10;
const FLAG_ATTESTED_CREDENTIAL_DATA = 0x40;

/** COSE_Key for an ES256 public key: kty=EC2, alg=ES256, crv=P-256. */
function toCoseKey(publicKey: KeyObject): Uint8Array {
  const jwk = publicKey.export({ format: "jwk" });
  if (!jwk.x || !jwk.y) {
    throw new Error("Expected an EC public key");
  }
  const cose = new Map<number, CBORType>([
    [1, 2], // kty: EC2
    [3, -7], // alg: ES256
    [-1, 1], // crv: P-256
    [-2, Buffer.from(jwk.x, "base64url")],
    [-3, Buffer.from(jwk.y, "base64url")],
  ]);
  return encodeCBOR(cose);
}

function toUint32BE(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
}

function buildClientDataJSON(input: {
  type: "webauthn.create" | "webauthn.get";
  challenge: string;
  origin: string;
}): Buffer {
  return Buffer.from(
    JSON.stringify({
      type: input.type,
      challenge: input.challenge,
      origin: input.origin,
      crossOrigin: false,
    }),
    "utf8",
  );
}

function buildAuthenticatorData(input: {
  rpId: string;
  flags: number;
  signCount: number;
  attestedCredentialData?: Buffer;
}): Buffer {
  return Buffer.concat([
    createHash("sha256").update(input.rpId).digest(),
    Buffer.of(input.flags),
    toUint32BE(input.signCount),
    input.attestedCredentialData ?? Buffer.alloc(0),
  ]);
}

/**
 * An ES256 signature over `authenticatorData || sha256(clientDataJSON)`, DER
 * encoded — exactly what an authenticator returns and what the server verifies.
 */
function sign(input: {
  privateKey: KeyObject;
  authenticatorData: Buffer;
  clientDataJSON: Buffer;
}): Buffer {
  const signer = createSign("sha256");
  signer.update(
    Buffer.concat([
      input.authenticatorData,
      createHash("sha256").update(input.clientDataJSON).digest(),
    ]),
  );
  signer.end();
  return signer.sign(input.privateKey);
}

export type FakeAuthenticatorOptions = {
  /** Defaults to a random 32-byte id, as a real authenticator would generate. */
  credentialId?: Buffer;
  /** Defaults to 1Password's, so the default-name lookup is exercised. */
  aaguid?: string;
  /** Whether the credential reports itself as synced. */
  backedUp?: boolean;
};

export class FakeAuthenticator {
  readonly credentialId: Buffer;
  readonly aaguid: string;
  private readonly backedUp: boolean;
  private readonly privateKey: KeyObject;
  private readonly publicKey: KeyObject;
  private signCount = 0;

  constructor(options: FakeAuthenticatorOptions = {}) {
    this.credentialId = options.credentialId ?? randomBytes(32);
    this.aaguid = options.aaguid ?? "bada5566-a7aa-401f-bd96-45619a55120d";
    this.backedUp = options.backedUp ?? true;
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
    });
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  private get flags(): number {
    return (
      FLAG_USER_PRESENT |
      FLAG_USER_VERIFIED |
      (this.backedUp ? FLAG_BACKUP_ELIGIBLE | FLAG_BACKED_UP : 0)
    );
  }

  /** The value `navigator.credentials.create()` would resolve to. */
  create(input: { challenge: string; origin: string; rpId: string }): {
    response: RegistrationResponseJSON;
    credentialId: string;
  } {
    const clientDataJSON = buildClientDataJSON({
      type: "webauthn.create",
      challenge: input.challenge,
      origin: input.origin,
    });

    const attestedCredentialData = Buffer.concat([
      Buffer.from(this.aaguid.replace(/-/g, ""), "hex"),
      Buffer.of(this.credentialId.length >> 8, this.credentialId.length & 0xff),
      this.credentialId,
      toCoseKey(this.publicKey),
    ]);

    const authenticatorData = buildAuthenticatorData({
      rpId: input.rpId,
      flags: this.flags | FLAG_ATTESTED_CREDENTIAL_DATA,
      signCount: this.signCount,
      attestedCredentialData,
    });

    const attestationObject = encodeCBOR(
      new Map<string, CBORType>([
        ["fmt", "none"],
        ["attStmt", new Map<string, CBORType>()],
        ["authData", new Uint8Array(authenticatorData)],
      ]),
    );

    const credentialId = this.credentialId.toString("base64url");
    return {
      credentialId,
      response: {
        id: credentialId,
        rawId: credentialId,
        type: "public-key",
        authenticatorAttachment: "platform",
        clientExtensionResults: { credProps: { rk: true } },
        response: {
          clientDataJSON: clientDataJSON.toString("base64url"),
          attestationObject:
            Buffer.from(attestationObject).toString("base64url"),
          transports: ["internal", "hybrid"],
        },
      },
    };
  }

  /** The value `navigator.credentials.get()` would resolve to. */
  get(input: {
    challenge: string;
    origin: string;
    rpId: string;
  }): AuthenticationResponseJSON {
    const clientDataJSON = buildClientDataJSON({
      type: "webauthn.get",
      challenge: input.challenge,
      origin: input.origin,
    });
    const authenticatorData = buildAuthenticatorData({
      rpId: input.rpId,
      flags: this.flags,
      signCount: this.signCount,
    });
    const signature = sign({
      privateKey: this.privateKey,
      authenticatorData,
      clientDataJSON,
    });

    const credentialId = this.credentialId.toString("base64url");
    return {
      id: credentialId,
      rawId: credentialId,
      type: "public-key",
      authenticatorAttachment: "platform",
      clientExtensionResults: {},
      response: {
        clientDataJSON: clientDataJSON.toString("base64url"),
        authenticatorData: authenticatorData.toString("base64url"),
        signature: signature.toString("base64url"),
      },
    };
  }
}
