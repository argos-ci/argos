import gqlTag from "graphql-tag";

import { SLACK_BOT_SCOPES } from "@/slack";

import type { IResolvers } from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  type SlackInstallation implements Node {
    id: ID!
    connectedAt: DateTime!
    teamName: String!
    teamDomain: String!
    isUpToDate: Boolean!
  }
`;

export const resolvers: IResolvers = {
  SlackInstallation: {
    isUpToDate: (installation) => {
      const bot = installation.installation?.bot;
      if (!bot) {
        return false;
      }
      // Logic to determine if the installation has a missing scope
      return SLACK_BOT_SCOPES.every((scope) => bot.scopes.includes(scope));
    },
  },
};
