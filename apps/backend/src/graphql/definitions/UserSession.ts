import gqlTag from "graphql-tag";

import { revokeAllSessions, revokeSession } from "@/auth/session";
import { isValidPgBigInt } from "@/database/util/biginteger";

import type { IResolvers } from "../__generated__/resolver-types";
import { forbidden, invalidId } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  type UserSession {
    id: ID!
    "Best-effort device/browser label parsed from the user agent."
    deviceLabel: String
    "Approximate geolocation captured at login, e.g. Paris, IDF, FR."
    location: String
    createdAt: DateTime!
    lastSeenAt: DateTime!
    "Whether this session is the one making the current request."
    isCurrent: Boolean!
  }

  input RevokeUserSessionInput {
    id: ID!
  }

  extend type Mutation {
    "Revoke one of the current user's sessions."
    revokeUserSession(input: RevokeUserSessionInput!): User!
    "Revoke all of the current user's sessions except the current one."
    revokeAllUserSessions: User!
  }
`;

export const resolvers: IResolvers = {
  UserSession: {
    location: (session) => {
      const parts = [session.city, session.region, session.country].filter(
        (part): part is string => Boolean(part),
      );
      return parts.length > 0 ? parts.join(", ") : null;
    },
    isCurrent: (session, _args, ctx) => {
      return ctx.auth?.sessionId === session.id;
    },
  },
  Mutation: {
    revokeUserSession: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }
      const { id } = args.input;
      if (!isValidPgBigInt(id)) {
        throw invalidId();
      }
      await revokeSession({ sessionId: id, userId: ctx.auth.user.id });
      return ctx.auth.account;
    },
    revokeAllUserSessions: async (_root, _args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }
      await revokeAllSessions({
        userId: ctx.auth.user.id,
        exceptSessionId: ctx.auth.sessionId,
      });
      return ctx.auth.account;
    },
  },
};
