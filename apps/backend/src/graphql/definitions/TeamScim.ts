import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { Team, TeamScimToken } from "@/database/models";
import { loadAccountById } from "@/database/services/team-member";
import { generateTeamScimToken, revokeTeamScimToken } from "@/scim/service";
import { getScimBaseUrl } from "@/scim/user";

import type { IResolvers } from "../__generated__/resolver-types";
import { toGraphQLError, unauthenticated } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  type TeamScimToken {
    id: ID!
    createdAt: DateTime!
    lastUsedAt: DateTime
  }

  type GenerateTeamScimTokenPayload {
    "The token value, only returned once at generation"
    token: String!
    team: Team!
  }

  extend type Team {
    "Base URL of the SCIM API, to configure in the Identity Provider"
    scimBaseUrl: String!
    "The SCIM token, visible to administrators only"
    scimToken: TeamScimToken
  }

  extend type Mutation {
    "Generate the token an Identity Provider provisions the team with, replacing the current one"
    generateTeamScimToken(teamAccountId: ID!): GenerateTeamScimTokenPayload!
    "Revoke the SCIM token, stopping provisioning"
    revokeTeamScimToken(teamAccountId: ID!): Team!
  }
`;

export const resolvers: IResolvers = {
  Team: {
    scimBaseUrl: () => getScimBaseUrl(),
    scimToken: async (account, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      invariant(account.teamId);
      const permissions = await Team.getPermissions(
        account.teamId,
        ctx.auth.user,
      );
      if (!permissions.includes("admin")) {
        return null;
      }
      const scimToken = await TeamScimToken.query().findOne({
        teamId: account.teamId,
      });
      return scimToken ?? null;
    },
  },
  Mutation: {
    generateTeamScimToken: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      try {
        const account = await loadAccountById(args.teamAccountId);
        const token = await generateTeamScimToken({
          account,
          user: ctx.auth.user,
        });
        return { token, team: account };
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
    revokeTeamScimToken: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      try {
        const account = await loadAccountById(args.teamAccountId);
        await revokeTeamScimToken({ account, user: ctx.auth.user });
        return account;
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
  },
};
