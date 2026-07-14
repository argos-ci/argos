import gqlTag from "graphql-tag";

import { OAuthGrant, OAuthGrantAccount } from "@/database/models";
import { transaction } from "@/database/transaction";
import { createAuthorizationCode } from "@/oauth/authorization-code";
import { getClientByClientId, validateRedirectUri } from "@/oauth/clients";
import { getKnownApp } from "@/oauth/known-apps";
import { isOAuthScope, OAUTH_SCOPES, parseScopeString } from "@/oauth/scopes";

import type { IResolvers } from "../__generated__/resolver-types";
import { getAccessibleAccounts } from "../services/account";
import { badUserInput, forbidden } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  "Public metadata about an OAuth application."
  type OAuthClient {
    id: ID!
    clientId: String!
    "Display name (the official name for verified apps)."
    name: String!
    "Whether this is a verified, well-known application."
    verified: Boolean!
    "Identifier of the matched well-known app, used to render its official logo."
    knownAppId: String
    "The client's self-provided logo URL (unverified apps)."
    logoUrl: String
    homepage: String
  }

  "A single scope requested on the consent screen."
  type OAuthConsentScope {
    scope: String!
    title: String!
    description: String!
  }

  "Everything the consent screen needs to render an authorization request."
  type OAuthConsentInfo {
    client: OAuthClient!
    scopes: [OAuthConsentScope!]!
    "Whether the requested redirect_uri is registered for this client."
    redirectValid: Boolean!
  }

  input AuthorizeOAuthConsentInput {
    clientId: ID!
    redirectUri: String!
    scopes: [String!]!
    "Organizations the application is granted access to."
    accountIds: [ID!]!
    state: String
    "PKCE S256 code challenge."
    codeChallenge: String!
    codeChallengeMethod: String!
    "Resource indicator (RFC 8707) the resulting tokens are bound to."
    resource: String
  }

  type AuthorizeOAuthConsentPayload {
    "Absolute URL to redirect the browser back to, carrying the authorization code."
    redirectUri: String!
  }

  extend type Query {
    "Metadata for an OAuth authorization request, used to render the consent screen."
    oauthConsentInfo(
      clientId: ID!
      redirectUri: String!
      scope: String!
    ): OAuthConsentInfo
  }

  extend type Mutation {
    "Approve an OAuth authorization request and mint an authorization code."
    authorizeOAuthConsent(
      input: AuthorizeOAuthConsentInput!
    ): AuthorizeOAuthConsentPayload!
  }
`;

export const resolvers: IResolvers = {
  OAuthClient: {
    name: (client) => {
      const app = getKnownApp(client.knownAppId);
      return app?.displayName ?? client.clientName;
    },
    logoUrl: (client) => client.logoUri,
    homepage: (client) => {
      const app = getKnownApp(client.knownAppId);
      return app?.homepage ?? client.clientUri;
    },
  },
  Query: {
    oauthConsentInfo: async (_root, args) => {
      const client = await getClientByClientId(args.clientId);
      if (!client) {
        return null;
      }
      const scopes = parseScopeString(args.scope).map((scope) => ({
        scope,
        title: OAUTH_SCOPES[scope].title,
        description: OAUTH_SCOPES[scope].description,
      }));
      return {
        client,
        scopes,
        redirectValid: validateRedirectUri(client, args.redirectUri),
      };
    },
  },
  Mutation: {
    authorizeOAuthConsent: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }
      const userId = ctx.auth.user.id;
      const {
        clientId,
        redirectUri,
        scopes,
        accountIds,
        state,
        codeChallenge,
        codeChallengeMethod,
        resource,
      } = args.input;

      if (codeChallengeMethod !== "S256") {
        throw badUserInput("Only the S256 code challenge method is supported");
      }
      if (!codeChallenge) {
        throw badUserInput("codeChallenge is required");
      }

      const client = await getClientByClientId(clientId);
      if (!client) {
        throw badUserInput("Unknown client");
      }
      // A mismatched redirect_uri is an attack vector — never redirect to it.
      if (!validateRedirectUri(client, redirectUri)) {
        throw badUserInput("Invalid redirect_uri for this client");
      }

      const requestedScopes = scopes.filter(isOAuthScope);
      if (requestedScopes.length !== scopes.length) {
        throw badUserInput("One or more requested scopes are invalid");
      }
      if (requestedScopes.length === 0) {
        throw badUserInput("At least one scope is required");
      }
      if (client.scope) {
        const allowed = new Set(parseScopeString(client.scope));
        if (!requestedScopes.every((scope) => allowed.has(scope))) {
          throw badUserInput("Requested scope is not allowed for this client");
        }
      }

      const accessibleAccounts = await getAccessibleAccounts({
        accountIds,
        userId,
      });
      if (accessibleAccounts.length !== accountIds.length) {
        throw badUserInput("One or more organizations are not accessible");
      }

      const grant = await transaction(async (trx) => {
        const existing = await OAuthGrant.query(trx).findOne({
          userId,
          oauthClientId: client.id,
        });
        const saved = existing
          ? await existing
              .$query(trx)
              .patchAndFetch({ scopes: requestedScopes, revokedAt: null })
          : await OAuthGrant.query(trx).insertAndFetch({
              userId,
              oauthClientId: client.id,
              scopes: requestedScopes,
              lastUsedAt: null,
              revokedAt: null,
            });
        // Replace the granted organizations with the freshly-consented set.
        await OAuthGrantAccount.query(trx)
          .where("oauthGrantId", saved.id)
          .delete();
        await OAuthGrantAccount.query(trx).insert(
          accessibleAccounts.map((account) => ({
            oauthGrantId: saved.id,
            accountId: account.id,
          })),
        );
        return saved;
      });

      const code = await createAuthorizationCode({
        grantId: grant.id,
        userId,
        clientId: client.clientId,
        redirectUri,
        scopes: requestedScopes,
        accountIds: accessibleAccounts.map((account) => account.id),
        codeChallenge,
        resource: resource ?? null,
      });

      const url = new URL(redirectUri);
      url.searchParams.set("code", code);
      if (state) {
        url.searchParams.set("state", state);
      }
      return { redirectUri: url.toString() };
    },
  },
};
