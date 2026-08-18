import gqlTag from "graphql-tag";

import config from "@/config";
import { OriginRepository } from "@/database/models";
import { ORIGIN_CONTENTS_READ_SCOPE } from "@/origin/url";

import type { IResolvers } from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  "An installation of the Argos app into a Cursor Origin namespace."
  type OriginInstallation implements Node {
    id: ID!
    "URL slug of the namespace the app is installed into."
    targetSlug: String!
    "Web URL of the namespace on Origin."
    url: String!
    "Whether the app can read commits and branches, so Argos computes merge bases itself."
    hasContentsAccess: Boolean!
    "Repositories the installation reaches, as last synchronized."
    repositories: [OriginRepository!]!
  }
`;

export const resolvers: IResolvers = {
  OriginInstallation: {
    url: (installation) =>
      `${config.get("origin.webUrl")}/${installation.targetSlug}`,
    hasContentsAccess: (installation) =>
      installation.hasScope(ORIGIN_CONTENTS_READ_SCOPE),
    repositories: async (installation) => {
      return OriginRepository.query()
        .where({ originInstallationId: installation.id })
        .orderBy("name", "asc");
    },
  },
};
