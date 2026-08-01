import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { completeLogin } from "@/auth/login";
import {
  createPasskeyAuthenticationOptions,
  createPasskeyRegistrationOptions,
  registerPasskey,
  verifyPasskeyAuthentication,
} from "@/auth/passkey";
import { parseDeviceLabel } from "@/auth/session";
import { PASSKEY_NAME_MAX_LENGTH, UserPasskey } from "@/database/models";
import { isValidPgBigInt } from "@/database/util/biginteger";

import type { IResolvers } from "../__generated__/resolver-types";
import type { Context } from "../context";
import {
  badUserInput,
  invalidId,
  toGraphQLError,
  unauthenticated,
} from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  type UserPasskey {
    id: ID!
    "Label shown to the user, defaulted from the authenticator and renameable."
    name: String!
    createdAt: DateTime!
    lastUsedAt: DateTime
    "Whether the provider syncs the passkey across the user's devices."
    synced: Boolean!
  }

  type PasskeyAuthenticationChallenge {
    "Opaque handle to the server-side challenge, handed back to \`authenticateWithPasskey\`."
    challengeId: String!
    "\`PublicKeyCredentialRequestOptions\` to pass to \`navigator.credentials.get()\`."
    options: JSONObject!
  }

  type PasskeyRegistrationChallenge {
    "Opaque handle to the server-side challenge, handed back to \`registerPasskey\`."
    challengeId: String!
    "\`PublicKeyCredentialCreationOptions\` to pass to \`navigator.credentials.create()\`."
    options: JSONObject!
  }

  input RegisterPasskeyInput {
    "The \`challengeId\` from \`createPasskeyRegistrationOptions\`."
    challengeId: String!
    "The \`RegistrationResponseJSON\` returned by \`navigator.credentials.create()\`."
    response: JSONObject!
  }

  input UpdatePasskeyInput {
    id: ID!
    name: String!
  }

  input DeletePasskeyInput {
    id: ID!
  }

  input AuthenticateWithPasskeyInput {
    "The \`challengeId\` from \`createPasskeyAuthenticationOptions\`."
    challengeId: String!
    "The \`AuthenticationResponseJSON\` returned by \`navigator.credentials.get()\`."
    response: JSONObject!
  }

  extend type Mutation {
    "Start the registration of a passkey for the current user"
    createPasskeyRegistrationOptions: PasskeyRegistrationChallenge!
    "Finish the registration of a passkey for the current user"
    registerPasskey(input: RegisterPasskeyInput!): UserPasskey!
    "Rename one of the current user's passkeys"
    updatePasskey(input: UpdatePasskeyInput!): UserPasskey!
    "Delete one of the current user's passkeys"
    deletePasskey(input: DeletePasskeyInput!): User!
    "Start a login with a passkey"
    createPasskeyAuthenticationOptions: PasskeyAuthenticationChallenge!
    "Finish a login with a passkey"
    authenticateWithPasskey(input: AuthenticateWithPasskeyInput!): AuthPayload!
  }
`;

/**
 * The passkey with the given id, or a user error when it is not one of the
 * authenticated user's. Scoping the lookup by `userId` — rather than reading the
 * row and comparing afterwards — is what keeps the mutations from touching
 * someone else's credential, and keeps them from revealing that it exists.
 */
async function getOwnPasskey(id: string, ctx: Context): Promise<UserPasskey> {
  if (!ctx.auth) {
    throw unauthenticated();
  }
  if (!isValidPgBigInt(id)) {
    throw invalidId();
  }
  const passkey = await UserPasskey.query().findOne({
    id,
    userId: ctx.auth.user.id,
  });
  if (!passkey) {
    throw badUserInput("Passkey not found");
  }
  return passkey;
}

export const resolvers: IResolvers = {
  UserPasskey: {
    synced: (passkey) => passkey.backedUp,
  },
  Mutation: {
    createPasskeyRegistrationOptions: async (_root, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const { user, account } = ctx.auth;
      return createPasskeyRegistrationOptions({
        userId: user.id,
        // Shown by the authenticator to tell Argos passkeys apart. The email is
        // the most recognisable handle we have; the slug stands in when the
        // account has none.
        userName: user.email ?? account.slug,
        userDisplayName: account.displayName,
      });
    },
    registerPasskey: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      try {
        return await registerPasskey({
          userId: ctx.auth.user.id,
          challengeId: args.input.challengeId,
          response: args.input.response,
          deviceLabel: parseDeviceLabel(ctx.req?.get("user-agent") ?? null),
        });
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
    updatePasskey: async (_root, args, ctx) => {
      const passkey = await getOwnPasskey(args.input.id, ctx);
      const name = args.input.name.trim();
      if (!name) {
        throw badUserInput("Passkey name cannot be empty", { field: "name" });
      }
      // Checked here rather than left to the column: an oversized name would
      // otherwise fail the model's validation as an Objection error nothing
      // maps, which Apollo reports as INTERNAL_SERVER_ERROR and Sentry pages on.
      if (name.length > PASSKEY_NAME_MAX_LENGTH) {
        throw badUserInput(
          `Keep the name under ${PASSKEY_NAME_MAX_LENGTH} characters.`,
          { field: "name" },
        );
      }
      return passkey.$query().patchAndFetch({ name });
    },
    deletePasskey: async (_root, args, ctx) => {
      const passkey = await getOwnPasskey(args.input.id, ctx);
      invariant(ctx.auth, "getOwnPasskey requires an authenticated user");
      await passkey.$query().delete();
      return ctx.auth.account;
    },
    createPasskeyAuthenticationOptions: async () => {
      return createPasskeyAuthenticationOptions();
    },
    authenticateWithPasskey: async (_root, args, ctx) => {
      const { challengeId, response } = args.input;
      invariant(ctx.req && ctx.res, "Login is only available over HTTP");

      let passkey;
      try {
        passkey = await verifyPasskeyAuthentication({ challengeId, response });
      } catch (error) {
        throw toGraphQLError(error);
      }

      // A passkey belongs to an account that already exists, so a login can
      // never be a signup. The credential carries the owner, and account
      // deletion removes the passkey with the other credentials, so there is
      // no account row left to look up.
      return completeLogin({
        req: ctx.req,
        res: ctx.res,
        userId: passkey.userId,
        method: "passkey",
        creation: false,
      });
    },
  },
};
