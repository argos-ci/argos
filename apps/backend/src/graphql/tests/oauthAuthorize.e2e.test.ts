import { createHash } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { getAuthPayloadFromOAuthAccessToken } from "@/auth/oauth-access-token";
import {
  OAuthAccessToken,
  OAuthClient,
  OAuthGrant,
  OAuthGrantAccount,
  OAuthRefreshToken,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { consumeAuthorizationCode } from "@/oauth/authorization-code";
import { getApiResourceUrl } from "@/oauth/metadata";
import { issueTokens, revokeGrant, rotateRefreshToken } from "@/oauth/tokens";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const REGISTERED_REDIRECT = "http://localhost/callback";
// Loopback callback with an ephemeral port (RFC 8252): must still match.
const ACTUAL_REDIRECT = "http://localhost:52123/callback";

function createTestClient() {
  return OAuthClient.query().insertAndFetch({
    clientId: "test-client",
    clientName: "Test Client",
    redirectUris: [REGISTERED_REDIRECT],
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    tokenEndpointAuthMethod: "none",
    isFirstParty: false,
    verified: false,
  });
}

const AuthorizeMutation = `
  mutation Authorize($input: AuthorizeOAuthConsentInput!) {
    authorizeOAuthConsent(input: $input) {
      redirectUri
    }
  }
`;

describe("OAuth authorization flow", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("mints a code that exchanges into a valid, scoped access token", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const client = await createTestClient();

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: userAccount.user!, account: userAccount },
    );

    const codeVerifier = "s".repeat(64);
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const res = await request(app)
      .post("/graphql")
      .send({
        query: AuthorizeMutation,
        variables: {
          input: {
            clientId: client.clientId,
            redirectUri: ACTUAL_REDIRECT,
            scopes: ["profile", "projects:read"],
            accountIds: [userAccount.id],
            state: "xyz",
            codeChallenge,
            codeChallengeMethod: "S256",
          },
        },
      });

    expectNoGraphQLError(res);
    const redirectUri = res.body.data.authorizeOAuthConsent.redirectUri;
    const url = new URL(redirectUri);
    expect(url.searchParams.get("state")).toBe("xyz");
    const code = url.searchParams.get("code");
    expect(code).toBeTruthy();

    // Exchange the code (what POST /oauth/token does).
    const payload = await consumeAuthorizationCode({
      code: code!,
      codeVerifier,
      clientId: client.clientId,
      redirectUri: ACTUAL_REDIRECT,
    });
    expect(payload).not.toBeNull();

    // The code is single-use.
    const replay = await consumeAuthorizationCode({
      code: code!,
      codeVerifier,
      clientId: client.clientId,
      redirectUri: ACTUAL_REDIRECT,
    });
    expect(replay).toBeNull();

    const tokens = await issueTokens({
      grantId: payload!.grantId,
      scopes: ["profile", "projects:read"],
      resource: payload!.resource,
    });
    expect(tokens.accessToken).toMatch(/^argos_oat_/);
    expect(tokens.refreshToken).toMatch(/^argos_ort_/);

    // The access token validates and carries the right identity + scopes.
    const auth = await getAuthPayloadFromOAuthAccessToken(tokens.accessToken);
    expect(auth.type).toBe("oauth");
    expect(auth.account.id).toBe(userAccount.id);
    expect(auth.clientId).toBe(client.clientId);
    expect([...auth.oauthScopes].sort()).toEqual(["profile", "projects:read"]);
    expect(auth.scope.map((a) => a.id)).toEqual([userAccount.id]);
  });

  it("revokes previously-issued tokens when the user re-consents", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const client = await createTestClient();
    const grant = await OAuthGrant.query().insertAndFetch({
      userId: userAccount.userId!,
      oauthClientId: client.id,
      scopes: ["profile", "projects:read"],
      lastUsedAt: null,
      revokedAt: null,
    });
    await OAuthGrantAccount.query().insert({
      oauthGrantId: grant.id,
      accountId: userAccount.id,
    });
    // A broad token from the first authorization.
    const old = await issueTokens({
      grantId: grant.id,
      scopes: ["profile", "projects:read"],
      resource: null,
    });
    await getAuthPayloadFromOAuthAccessToken(old.accessToken);

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: userAccount.user!, account: userAccount },
    );

    // Re-consent, this time dropping projects:read.
    const res = await request(app)
      .post("/graphql")
      .send({
        query: AuthorizeMutation,
        variables: {
          input: {
            clientId: client.clientId,
            redirectUri: ACTUAL_REDIRECT,
            scopes: ["profile"],
            accountIds: [userAccount.id],
            codeChallenge: "challenge",
            codeChallengeMethod: "S256",
          },
        },
      });
    expectNoGraphQLError(res);

    // The old broad token is dead, but the grant itself stays active.
    await expect(
      getAuthPayloadFromOAuthAccessToken(old.accessToken),
    ).rejects.toThrow();
    const refreshed = await OAuthGrant.query().findById(grant.id);
    expect(refreshed?.revokedAt).toBeNull();
    expect(refreshed?.scopes).toEqual(["profile"]);
  });

  it("rejects an unregistered redirect_uri at consent", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const client = await createTestClient();

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: userAccount.user!, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: AuthorizeMutation,
        variables: {
          input: {
            clientId: client.clientId,
            redirectUri: "https://evil.example/callback",
            scopes: ["profile"],
            accountIds: [userAccount.id],
            codeChallenge: "challenge",
            codeChallengeMethod: "S256",
          },
        },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toBe(
      "Invalid redirect_uri for this client",
    );
    expect(await OAuthGrant.query()).toHaveLength(0);
  });

  it("rotates refresh tokens and revokes the grant on reuse", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const client = await createTestClient();
    const grant = await OAuthGrant.query().insertAndFetch({
      userId: userAccount.userId!,
      oauthClientId: client.id,
      scopes: ["profile"],
      lastUsedAt: null,
      revokedAt: null,
    });
    await OAuthGrantAccount.query().insert({
      oauthGrantId: grant.id,
      accountId: userAccount.id,
    });
    const initial = await issueTokens({
      grantId: grant.id,
      scopes: ["profile"],
      resource: null,
    });

    // First rotation succeeds.
    const rotated = await rotateRefreshToken({
      refreshToken: initial.refreshToken,
      clientId: client.clientId,
      requestedScopes: null,
      resource: null,
    });
    if (!rotated.ok) {
      throw new Error("expected the first rotation to succeed");
    }

    // Reusing the now-rotated token is treated as theft: the grant is revoked.
    const reused = await rotateRefreshToken({
      refreshToken: initial.refreshToken,
      clientId: client.clientId,
      requestedScopes: null,
      resource: null,
    });
    expect(reused.ok).toBe(false);

    const refreshedGrant = await OAuthGrant.query().findById(grant.id);
    expect(refreshedGrant?.revokedAt).not.toBeNull();

    // Tokens minted by the (now revoked) grant no longer authenticate.
    await expect(
      getAuthPayloadFromOAuthAccessToken(rotated.tokens.accessToken),
    ).rejects.toThrow();
  });

  it("only lets one concurrent rotation of the same refresh token win", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const client = await createTestClient();
    const grant = await OAuthGrant.query().insertAndFetch({
      userId: userAccount.userId!,
      oauthClientId: client.id,
      scopes: ["profile"],
      lastUsedAt: null,
      revokedAt: null,
    });
    await OAuthGrantAccount.query().insert({
      oauthGrantId: grant.id,
      accountId: userAccount.id,
    });
    const initial = await issueTokens({
      grantId: grant.id,
      scopes: ["profile"],
      resource: null,
    });

    // Two requests present the same refresh token at the same time: exactly one
    // must succeed, and only one new refresh token may exist for the grant.
    const [a, b] = await Promise.all([
      rotateRefreshToken({
        refreshToken: initial.refreshToken,
        clientId: client.clientId,
        requestedScopes: null,
        resource: null,
      }),
      rotateRefreshToken({
        refreshToken: initial.refreshToken,
        clientId: client.clientId,
        requestedScopes: null,
        resource: null,
      }),
    ]);

    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    const live = await OAuthRefreshToken.query()
      .where({ oauthGrantId: grant.id })
      .whereNull("revokedAt");
    expect(live).toHaveLength(1);
  });

  it("rejects an access token bound to a different resource (audience)", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const client = await createTestClient();
    const grant = await OAuthGrant.query().insertAndFetch({
      userId: userAccount.userId!,
      oauthClientId: client.id,
      scopes: ["profile"],
      lastUsedAt: null,
      revokedAt: null,
    });
    await OAuthGrantAccount.query().insert({
      oauthGrantId: grant.id,
      accountId: userAccount.id,
    });

    // A token bound to another resource server must not authenticate here.
    const foreign = await issueTokens({
      grantId: grant.id,
      scopes: ["profile"],
      resource: "https://mcp.example/other",
    });
    await expect(
      getAuthPayloadFromOAuthAccessToken(foreign.accessToken),
    ).rejects.toThrow();

    // A token bound to this API's resource authenticates fine.
    const bound = await issueTokens({
      grantId: grant.id,
      scopes: ["profile"],
      resource: getApiResourceUrl(),
    });
    const auth = await getAuthPayloadFromOAuthAccessToken(bound.accessToken);
    expect(auth.type).toBe("oauth");
  });

  it("revoking a grant invalidates its access tokens", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const client = await createTestClient();
    const grant = await OAuthGrant.query().insertAndFetch({
      userId: userAccount.userId!,
      oauthClientId: client.id,
      scopes: ["profile"],
      lastUsedAt: null,
      revokedAt: null,
    });
    await OAuthGrantAccount.query().insert({
      oauthGrantId: grant.id,
      accountId: userAccount.id,
    });
    const tokens = await issueTokens({
      grantId: grant.id,
      scopes: ["profile"],
      resource: null,
    });

    // Valid before revocation.
    await getAuthPayloadFromOAuthAccessToken(tokens.accessToken);

    await revokeGrant(grant.id);

    await expect(
      getAuthPayloadFromOAuthAccessToken(tokens.accessToken),
    ).rejects.toThrow();
    expect(await OAuthAccessToken.query().whereNull("revokedAt")).toHaveLength(
      0,
    );
  });
});
