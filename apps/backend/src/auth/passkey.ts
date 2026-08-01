import { randomBytes } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { z } from "zod";

import config from "@/config";
import { isUniqueViolationError } from "@/database/error";
import { UserPasskey } from "@/database/models";
import logger from "@/logger";
import { boom } from "@/util/error";
import { getRedisClient } from "@/util/redis/client";

import { getDefaultPasskeyName } from "./passkey-authenticators";

/**
 * The name shown by the authenticator when it asks the user to create or use a
 * passkey.
 */
const RP_NAME = "Argos";

/**
 * How long the browser gives the user to complete a prompt.
 *
 * Sent explicitly rather than left to the library's 60s default, which is not
 * enough for the cross-device flow — scan a QR code, unlock the phone, confirm.
 */
const CEREMONY_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * How long the server keeps an unfinished ceremony's challenge. Exceeds
 * `CEREMONY_TIMEOUT_MS` so the browser is always the one to give up first: a
 * challenge that expired underneath a still-open prompt would fail the user at
 * the very end, with nothing to distinguish it from a rejected credential.
 */
const CHALLENGE_TTL_MS = CEREMONY_TIMEOUT_MS + 2 * 60 * 1000;

/**
 * The Relying Party id: the domain a credential is bound to.
 *
 * This is the anchor of WebAuthn's phishing resistance — an authenticator only
 * releases a credential to the domain it was created for — so it never comes
 * from the request, only from our own configuration. It must be the effective
 * domain of the page running the ceremony or a registrable suffix of it, which
 * is why the deployed environments set it to the parent domain
 * (`argos-ci.com`, matching the session cookie's scope) rather than letting it
 * default to `app.`: a passkey then survives the app moving between subdomains.
 */
function getRpID(): string {
  return (
    config.get("webauthn.rpId") || new URL(config.get("server.url")).hostname
  );
}

/**
 * The origins a ceremony may have been performed on.
 *
 * The RP id and this list have to be kept in step. Scoping the RP id to the
 * parent domain makes the authenticator willing to release a credential to any
 * subdomain under it — but the server still pins the origin, so a subdomain
 * missing from this list is refused after the user has already approved the
 * prompt. `server.url` is always allowed; `webauthn.origins` is how a second
 * subdomain gets added, and is what makes the parent-domain RP id actually
 * deliver the portability it is chosen for.
 */
function getExpectedOrigins(): string[] {
  const origins = [new URL(config.get("server.url")).origin];
  for (const origin of config.get("webauthn.origins")) {
    const parsed = new URL(origin).origin;
    if (!origins.includes(parsed)) {
      origins.push(parsed);
    }
  }
  return origins;
}

function getRegistrationChallengeKey(challengeId: string): string {
  return `passkey_registration_challenge:${challengeId}`;
}

/** An opaque handle to a stored challenge. Grants nothing on its own — only the
 * holder of the private key can sign the challenge it points at. */
function generateChallengeId(): string {
  return randomBytes(32).toString("base64url");
}

function getAuthenticationChallengeKey(challengeId: string): string {
  return `passkey_authentication_challenge:${challengeId}`;
}

async function storeChallenge(key: string, challenge: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(key, challenge, {
    expiration: { type: "PX", value: CHALLENGE_TTL_MS },
  });
}

/**
 * Read a stored challenge and delete it in the same round-trip, so a single
 * challenge can never be replayed by a second ceremony.
 */
async function consumeChallenge(key: string): Promise<string | null> {
  const redis = await getRedisClient();
  return redis.getDel(key);
}

function expiredCeremony(): never {
  throw boom(400, "The passkey request expired. Please try again.", {
    code: "PASSKEY_CHALLENGE_EXPIRED",
  });
}

/**
 * Reject a credential the verifier refused.
 *
 * `verifyRegistrationResponse` and `verifyAuthenticationResponse` throw on every
 * mismatch (origin, RP id, challenge, signature, counter…), and none of those
 * are server faults — they are a rejected credential, so they must not surface
 * as a 500.
 *
 * The library's own message never reaches the client. It is templated with
 * server-side values (`expected "https://app.argos-ci.com"`, `expected counter
 * 42`), and this path is reachable unauthenticated, so forwarding it both
 * discloses internals — the counter check runs before the signature is verified,
 * so a garbage-signed assertion would read back a credential's counter — and
 * shows the user a string they cannot act on. It goes to the logs instead.
 */
function rejected(error: unknown): never {
  logger.warn({ error }, "passkey verification failed");
  throw boom(400, "This passkey could not be verified. Please try again.", {
    code: "PASSKEY_VERIFICATION_FAILED",
    cause: error,
  });
}

/**
 * The subset of the WebAuthn client extension outputs we accept. Loose, because
 * the browser is free to return extensions we did not ask for, and rejecting the
 * ceremony over one would gain nothing.
 */
const ClientExtensionResultsSchema = z.looseObject({
  appid: z.boolean().optional(),
  credProps: z.looseObject({ rk: z.boolean().optional() }).optional(),
  hmacCreateSecret: z.boolean().optional(),
});

const CredentialSchema = z.object({
  id: z.string(),
  rawId: z.string(),
  type: z.literal("public-key"),
  authenticatorAttachment: z.enum(["cross-platform", "platform"]).optional(),
  clientExtensionResults: ClientExtensionResultsSchema,
});

const RegistrationResponseSchema = CredentialSchema.extend({
  response: z.object({
    clientDataJSON: z.string(),
    attestationObject: z.string(),
    authenticatorData: z.string().optional(),
    transports: z.array(z.string()).optional(),
    publicKeyAlgorithm: z.number().optional(),
    publicKey: z.string().optional(),
  }),
});

const AuthenticationResponseSchema = CredentialSchema.extend({
  response: z.object({
    clientDataJSON: z.string(),
    authenticatorData: z.string(),
    signature: z.string(),
    userHandle: z.string().optional(),
  }),
});

/**
 * Whether the value the client submitted is shaped like the browser's
 * `RegistrationResponseJSON`.
 *
 * A guard rather than a parse: the credential travels through a `JSONObject`
 * GraphQL input, so this schema is the only thing constraining its shape, and
 * narrowing in place hands the verifier the exact object the browser produced
 * instead of a re-built copy of it.
 */
function isRegistrationResponse(
  value: unknown,
): value is RegistrationResponseJSON {
  return RegistrationResponseSchema.safeParse(value).success;
}

/** Whether the value is shaped like the browser's `AuthenticationResponseJSON`. */
function isAuthenticationResponse(
  value: unknown,
): value is AuthenticationResponseJSON {
  return AuthenticationResponseSchema.safeParse(value).success;
}

function malformedCredential(): never {
  throw boom(400, "Malformed passkey credential", {
    code: "PASSKEY_VERIFICATION_FAILED",
  });
}

const KNOWN_TRANSPORTS: ReadonlySet<string> = new Set(UserPasskey.transports);

/**
 * Keep only the transports the column accepts. They are replayed to the browser
 * purely as a hint, so dropping one a future authenticator invents costs
 * nothing — whereas storing it would fail the model's validation.
 */
function toStoredTransports(
  transports: readonly string[] | undefined,
): (typeof UserPasskey.transports)[number][] | null {
  const known = transports?.filter(
    (transport): transport is (typeof UserPasskey.transports)[number] =>
      KNOWN_TRANSPORTS.has(transport),
  );
  return known?.length ? known : null;
}

/**
 * Start a passkey registration for a signed-in user.
 *
 * The challenge is keyed by a fresh handle rather than by the user, so two
 * ceremonies running at once — two tabs, two windows — do not overwrite each
 * other. Keying by user meant the second `create` clobbered the first's
 * challenge and both ceremonies then failed, one on a mismatch and one on a
 * missing key, even though the user had approved both prompts.
 */
export async function createPasskeyRegistrationOptions(input: {
  userId: string;
  userName: string;
  userDisplayName: string;
}): Promise<{
  challengeId: string;
  options: PublicKeyCredentialCreationOptionsJSON;
}> {
  const existingPasskeys = await UserPasskey.query()
    .select("credentialId", "transports")
    .where("userId", input.userId);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpID(),
    timeout: CEREMONY_TIMEOUT_MS,
    // The user handle. Our own id rather than the email, so that changing an
    // email address never orphans a credential.
    userID: new TextEncoder().encode(input.userId),
    userName: input.userName,
    userDisplayName: input.userDisplayName,
    // We do not verify authenticator provenance, so asking for an attestation
    // statement would only add a privacy-sensitive identifier to the response.
    attestationType: "none",
    // Registering the same authenticator twice would leave the user with two
    // indistinguishable passkeys.
    excludeCredentials: existingPasskeys.map((passkey) => ({
      id: passkey.credentialId,
      ...(passkey.transports ? { transports: passkey.transports } : {}),
    })),
    authenticatorSelection: {
      // Discoverable, so "Continue with Passkey" can resolve the account from
      // the credential alone — no email typed first.
      residentKey: "required",
      userVerification: "preferred",
    },
  });

  const challengeId = generateChallengeId();
  await storeChallenge(
    getRegistrationChallengeKey(challengeId),
    options.challenge,
  );

  return { challengeId, options };
}

/**
 * Finish a passkey registration and persist the credential.
 *
 * `deviceLabel` only feeds the default name, which the user can change.
 */
export async function registerPasskey(input: {
  userId: string;
  challengeId: string;
  response: unknown;
  deviceLabel: string | null;
}): Promise<UserPasskey> {
  const { response } = input;
  if (!isRegistrationResponse(response)) {
    malformedCredential();
  }

  const expectedChallenge = await consumeChallenge(
    getRegistrationChallengeKey(input.challengeId),
  );
  if (!expectedChallenge) {
    expiredCeremony();
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpID(),
      // Paired with the `preferred` we asked for: a security key without a PIN
      // is still a legitimate passkey, it just did not verify the user.
      requireUserVerification: false,
    });
  } catch (error) {
    rejected(error);
  }

  if (!verification.verified) {
    rejected(new Error("verification returned verified: false"));
  }

  const { credential, credentialDeviceType, credentialBackedUp, aaguid } =
    verification.registrationInfo;

  try {
    return await UserPasskey.query().insertAndFetch({
      userId: input.userId,
      credentialId: credential.id,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: String(credential.counter),
      transports: toStoredTransports(credential.transports),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      aaguid,
      name: getDefaultPasskeyName({ aaguid, deviceLabel: input.deviceLabel }),
      lastUsedAt: null,
    });
  } catch (error) {
    // `excludeCredentials` asks the authenticator not to re-create a credential
    // it already holds for us, but it is a hint the authenticator may ignore —
    // and it says nothing about the credential being registered on *another*
    // account. The unique index is what actually keeps one credential to one
    // account, so a violation here is a user error, not a server fault.
    if (isUniqueViolationError(error)) {
      throw boom(400, "This passkey is already registered.", {
        code: "PASSKEY_ALREADY_REGISTERED",
        cause: error,
      });
    }
    throw error;
  }
}

/**
 * Start a passkey login.
 *
 * Returns an opaque handle to the challenge alongside the browser options: at
 * this point there is no session and no email, so there is nothing else to key
 * the challenge by. The handle grants nothing on its own — only the holder of
 * the private key can produce a signature over the challenge it points at.
 */
export async function createPasskeyAuthenticationOptions(): Promise<{
  challengeId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
}> {
  const options = await generateAuthenticationOptions({
    rpID: getRpID(),
    timeout: CEREMONY_TIMEOUT_MS,
    // No `allowCredentials`: the credentials are discoverable, so the
    // authenticator offers the accounts it holds and the user picks one.
    userVerification: "preferred",
  });

  const challengeId = generateChallengeId();
  await storeChallenge(
    getAuthenticationChallengeKey(challengeId),
    options.challenge,
  );

  return { challengeId, options };
}

/**
 * Finish a passkey login: verify the assertion and return the passkey it
 * authenticated. The caller opens the session.
 */
export async function verifyPasskeyAuthentication(input: {
  challengeId: string;
  response: unknown;
}): Promise<UserPasskey> {
  const { response } = input;
  if (!isAuthenticationResponse(response)) {
    malformedCredential();
  }

  const expectedChallenge = await consumeChallenge(
    getAuthenticationChallengeKey(input.challengeId),
  );
  if (!expectedChallenge) {
    expiredCeremony();
  }

  const passkey = await UserPasskey.query().findOne({
    credentialId: response.id,
  });
  if (!passkey) {
    throw boom(400, "This passkey is not registered on any Argos account.", {
      code: "PASSKEY_UNKNOWN_CREDENTIAL",
    });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpID(),
      credential: {
        id: passkey.credentialId,
        publicKey: isoBase64URL.toBuffer(passkey.publicKey),
        counter: Number(passkey.counter),
        ...(passkey.transports ? { transports: passkey.transports } : {}),
      },
      requireUserVerification: false,
    });
  } catch (error) {
    rejected(error);
  }

  if (!verification.verified) {
    rejected(new Error("verification returned verified: false"));
  }

  // Move the replay counter forward. Authenticators that keep one report a
  // strictly increasing value, and `verifyAuthenticationResponse` has already
  // refused anything that went backwards.
  await passkey.$query().patch({
    counter: String(verification.authenticationInfo.newCounter),
    lastUsedAt: new Date().toISOString(),
  });

  return passkey;
}
