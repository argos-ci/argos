import gqlTag from "graphql-tag";

import { IResolvers } from "../__generated__/resolver-types.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  type GithubInstallation implements Node {
    id: ID!
    ghInstallation: GhApiInstallation
    ghAccount: GhApiInstallationAccount
  }
`;

export const resolvers: IResolvers = {
  GithubInstallation: {
    ghInstallation: async (installation, _args, { loaders }) => {
      return loaders.GhApiInstallation.load({
        app: installation.app,
        installationId: installation.githubId,
      });
    },
    ghAccount: async (installation, _args, { loaders }) => {
      const ghInstallation = await loaders.GhApiInstallation.load({
        app: installation.app,
        installationId: installation.githubId,
      });
      if (
        !ghInstallation ||
        !ghInstallation.account ||
        !("login" in ghInstallation.account)
      ) {
        return null;
      }
      const { id, login, name, url } = ghInstallation.account;
      return {
        id: String(id),
        login,
        name: name || null,
        url,
      };
    },
  },
};
