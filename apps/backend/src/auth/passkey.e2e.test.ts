import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, test } from "vitest";

import config from "@/config";
import { UserPasskey } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { HTTPError } from "@/util/error";
import { setupRedis } from "@/util/redis/testing";

import {
  createPasskeyAuthenticationOptions,
  createPasskeyRegistrationOptions,
  registerPasskey,
  verifyPasskeyAuthentication,
} from "./passkey";
import { FakeAuthenticator } from "./passkey.test-util";

setupRedis();

const RP_ID = new URL(config.get("server.url")).hostname;
const ORIGIN = new URL(config.get("server.url")).origin;

/**
 * Drive a full registration ceremony the way the browser would: ask for the
 * options, hand the challenge to the authenticator, submit what it returns.
 */
async function register(input: {
  userId: string;
  authenticator: FakeAuthenticator;
}): Promise<UserPasskey> {
  const options = await createPasskeyRegistrationOptions({
    userId: input.userId,
    userName: "jane@example.com",
    userDisplayName: "Jane",
  });
  const { response } = input.authenticator.create({
    challenge: options.challenge,
    origin: ORIGIN,
    rpId: RP_ID,
  });
  return registerPasskey({
    userId: input.userId,
    response,
    deviceLabel: "Chrome on macOS",
  });
}

/** Drive a full authentication ceremony. */
async function authenticate(input: {
  authenticator: FakeAuthenticator;
}): Promise<UserPasskey> {
  const { challengeId, options } = await createPasskeyAuthenticationOptions();
  const response = input.authenticator.get({
    challenge: options.challenge,
    origin: ORIGIN,
    rpId: RP_ID,
  });
  return verifyPasskeyAuthentication({ challengeId, response });
}

/**
 * The status and Argos error code a rejected ceremony reported. Fails the test
 * if the call resolved, so a silently-accepted credential can never read as a
 * pass.
 */
async function expectRejection(
  promise: Promise<unknown>,
): Promise<{ statusCode: number; code: string | null; message: string }> {
  try {
    await promise;
  } catch (error) {
    invariant(error instanceof HTTPError, "Expected an HTTPError");
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    };
  }
  throw new Error("Expected the ceremony to be rejected");
}

describe("passkey", () => {
  let userId: string;

  beforeEach(async () => {
    await setupDatabase();
    const user = await factory.User.create();
    userId = user.id;
  });

  describe("registration", () => {
    test("persists the credential of a completed ceremony", async () => {
      const authenticator = new FakeAuthenticator();
      const passkey = await register({ userId, authenticator });

      expect(passkey).toMatchObject({
        userId,
        credentialId: authenticator.credentialId.toString("base64url"),
        aaguid: authenticator.aaguid,
        deviceType: "multiDevice",
        backedUp: true,
        counter: "0",
        lastUsedAt: null,
      });
      // Only the transports the column accepts, and the public key as base64url.
      expect(passkey.transports).toEqual(["internal", "hybrid"]);
      expect(passkey.publicKey).toMatch(/^[\w-]+$/);
    });

    test("names the passkey after the authenticator it came from", async () => {
      const passkey = await register({
        userId,
        authenticator: new FakeAuthenticator(),
      });
      expect(passkey.name).toBe("1Password");
    });

    test("falls back to the device when the authenticator is anonymous", async () => {
      const passkey = await register({
        userId,
        authenticator: new FakeAuthenticator({
          aaguid: "00000000-0000-0000-0000-000000000000",
        }),
      });
      expect(passkey.name).toBe("Chrome on macOS");
    });

    test("lists already-registered credentials so one cannot be added twice", async () => {
      const authenticator = new FakeAuthenticator();
      const passkey = await register({ userId, authenticator });

      const options = await createPasskeyRegistrationOptions({
        userId,
        userName: "jane@example.com",
        userDisplayName: "Jane",
      });
      expect(options.excludeCredentials).toEqual([
        {
          id: passkey.credentialId,
          type: "public-key",
          transports: ["internal", "hybrid"],
        },
      ]);
    });

    test("refuses a credential already registered on another account", async () => {
      const authenticator = new FakeAuthenticator();
      await register({ userId, authenticator });
      const other = await factory.User.create();

      // `excludeCredentials` is only a hint, and it says nothing about other
      // accounts — the unique index is what enforces one credential, one account.
      const rejection = await expectRejection(
        register({ userId: other.id, authenticator }),
      );
      expect(rejection).toMatchObject({
        statusCode: 400,
        code: "PASSKEY_ALREADY_REGISTERED",
      });
    });

    test("refuses a ceremony performed on another origin", async () => {
      const options = await createPasskeyRegistrationOptions({
        userId,
        userName: "jane@example.com",
        userDisplayName: "Jane",
      });
      const { response } = new FakeAuthenticator().create({
        challenge: options.challenge,
        origin: "https://evil.test",
        rpId: RP_ID,
      });

      const rejection = await expectRejection(
        registerPasskey({ userId, response, deviceLabel: null }),
      );
      expect(rejection.statusCode).toBe(400);
      // The verifier names the expected origin in its own message; the client
      // must never see it.
      expect(rejection.message).toBe(
        "This passkey could not be verified. Please try again.",
      );
      expect(rejection.message).not.toContain("evil.test");
      expect(rejection.message).not.toContain(ORIGIN);
      expect(await UserPasskey.query().resultSize()).toBe(0);
    });

    test("refuses a challenge that was never issued", async () => {
      const { response } = new FakeAuthenticator().create({
        challenge: "a-challenge-we-never-issued",
        origin: ORIGIN,
        rpId: RP_ID,
      });

      const rejection = await expectRejection(
        registerPasskey({ userId, response, deviceLabel: null }),
      );
      expect(rejection).toMatchObject({
        statusCode: 400,
        code: "PASSKEY_CHALLENGE_EXPIRED",
      });
    });

    test("refuses a malformed credential", async () => {
      const rejection = await expectRejection(
        registerPasskey({
          userId,
          response: { id: "nope" },
          deviceLabel: null,
        }),
      );
      expect(rejection).toMatchObject({
        statusCode: 400,
        code: "PASSKEY_VERIFICATION_FAILED",
      });
    });
  });

  describe("authentication", () => {
    test("resolves the owner from the credential alone", async () => {
      const authenticator = new FakeAuthenticator();
      const registered = await register({ userId, authenticator });

      const authenticated = await authenticate({ authenticator });
      expect(authenticated.id).toBe(registered.id);
      expect(authenticated.userId).toBe(userId);
    });

    test("records when the passkey was last used", async () => {
      const authenticator = new FakeAuthenticator();
      await register({ userId, authenticator });

      const authenticated = await authenticate({ authenticator });
      expect(authenticated.lastUsedAt).not.toBeNull();
    });

    test("refuses a challenge that was already used", async () => {
      const authenticator = new FakeAuthenticator();
      await register({ userId, authenticator });

      const { challengeId, options } =
        await createPasskeyAuthenticationOptions();
      const response = authenticator.get({
        challenge: options.challenge,
        origin: ORIGIN,
        rpId: RP_ID,
      });

      await verifyPasskeyAuthentication({ challengeId, response });

      // Replaying the very same assertion must not open a second session.
      const rejection = await expectRejection(
        verifyPasskeyAuthentication({ challengeId, response }),
      );
      expect(rejection).toMatchObject({
        statusCode: 400,
        code: "PASSKEY_CHALLENGE_EXPIRED",
      });
    });

    test("refuses a credential that is not registered", async () => {
      const rejection = await expectRejection(
        authenticate({ authenticator: new FakeAuthenticator() }),
      );
      expect(rejection).toMatchObject({
        statusCode: 400,
        code: "PASSKEY_UNKNOWN_CREDENTIAL",
      });
    });

    test("refuses an assertion signed by a different key", async () => {
      const authenticator = new FakeAuthenticator();
      await register({ userId, authenticator });

      // Same credential id, different key pair: what an attacker replaying a
      // stolen credential id without the private key would produce.
      const impostor = new FakeAuthenticator({
        credentialId: authenticator.credentialId,
      });

      const rejection = await expectRejection(
        authenticate({ authenticator: impostor }),
      );
      expect(rejection.statusCode).toBe(400);
    });

    test("refuses an assertion for another relying party", async () => {
      const authenticator = new FakeAuthenticator();
      await register({ userId, authenticator });

      const { challengeId, options } =
        await createPasskeyAuthenticationOptions();
      const response = authenticator.get({
        challenge: options.challenge,
        origin: ORIGIN,
        rpId: "evil.test",
      });

      const rejection = await expectRejection(
        verifyPasskeyAuthentication({ challengeId, response }),
      );
      expect(rejection.statusCode).toBe(400);
    });
  });
});
